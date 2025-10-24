import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Loader2,
  Bell,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SLAMonitoringProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface SLAData {
  id: number;
  complaint_id: number;
  complaint_number: string;
  urgency_level: string;
  sla_deadline: string;
  sla_status: 'on_track' | 'at_risk' | 'breached';
  assigned_staff_id: number;
  assigned_staff_name: string;
  hours_remaining: number;
  calculated_sla_status: string;
}

interface SLAStats {
  total_complaints: number;
  on_track: number;
  at_risk: number;
  breached: number;
  avg_resolution_time: number;
  sla_performance: number;
}

const SLAMonitoring: React.FC<SLAMonitoringProps> = ({
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<'all' | 'at_risk' | 'breached'>('all');

  useEffect(() => {
    fetchSLAData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSLAData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchSLAData = async () => {
    try {
      const response = await api.complaints.getSLAMonitoring();
      
      if (response.success) {
        setSlaData(response.data.complaints || []);
        setStats(response.data.stats || null);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching SLA data:', error);
      toast.error('Failed to fetch SLA monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const getSlaStatusBadge = (status: string) => {
    const statusConfig = {
      on_track: { label: 'On Track', color: 'bg-green-100 text-green-800' },
      at_risk: { label: 'At Risk', color: 'bg-yellow-100 text-yellow-800' },
      breached: { label: 'Breached', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.on_track;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      low: { label: 'Low', color: 'bg-green-100 text-green-800' },
      medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
      critical: { label: 'Critical', color: 'bg-red-100 text-red-800' }
    };

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.medium;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatTimeRemaining = (hours: number) => {
    if (hours <= 0) {
      return 'Overdue';
    } else if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
  };

  const getTimeRemainingColor = (hours: number) => {
    if (hours <= 0) return 'text-red-600';
    if (hours <= 2) return 'text-orange-600';
    if (hours <= 24) return 'text-yellow-600';
    return 'text-green-600';
  };

  const filteredData = slaData.filter(item => {
    if (filter === 'at_risk') return item.sla_status === 'at_risk';
    if (filter === 'breached') return item.sla_status === 'breached';
    return true;
  });

  const handleEscalate = async (complaintId: number) => {
    try {
      const response = await api.complaints.escalate(complaintId, {
        escalation_reason: 'SLA breach detected',
        manual_escalation: true
      });
      
      if (response.success) {
        toast.success('Complaint escalated successfully');
        fetchSLAData();
      }
    } catch (error) {
      toast.error('Failed to escalate complaint');
    }
  };

  const handleAssign = async (complaintId: number) => {
    try {
      const response = await api.complaints.assign(complaintId, {
        auto_assign: true
      });
      
      if (response.success) {
        toast.success('Complaint assigned successfully');
        fetchSLAData();
      }
    } catch (error) {
      toast.error('Failed to assign complaint');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SLA Monitoring</h1>
          <p className="text-gray-600">
            Real-time SLA tracking and breach management
          </p>
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchSLAData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* SLA Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Complaints</p>
                  <p className="text-2xl font-bold">{stats.total_complaints}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On Track</p>
                  <p className="text-2xl font-bold text-green-600">{stats.on_track}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <Progress 
                  value={(stats.on_track / stats.total_complaints) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">At Risk</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.at_risk}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="mt-2">
                <Progress 
                  value={(stats.at_risk / stats.total_complaints) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Breached</p>
                  <p className="text-2xl font-bold text-red-600">{stats.breached}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="mt-2">
                <Progress 
                  value={(stats.breached / stats.total_complaints) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SLA Performance Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              SLA Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.round(stats.sla_performance)}%
                </div>
                <div className="text-sm text-gray-600">SLA Performance</div>
                <div className="mt-2">
                  <Progress value={stats.sla_performance} className="h-2" />
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(stats.avg_resolution_time)}h
                </div>
                <div className="text-sm text-gray-600">Avg Resolution Time</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round((stats.on_track / stats.total_complaints) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({slaData.length})
        </Button>
        <Button
          variant={filter === 'at_risk' ? 'default' : 'outline'}
          onClick={() => setFilter('at_risk')}
        >
          At Risk ({slaData.filter(item => item.sla_status === 'at_risk').length})
        </Button>
        <Button
          variant={filter === 'breached' ? 'default' : 'outline'}
          onClick={() => setFilter('breached')}
        >
          Breached ({slaData.filter(item => item.sla_status === 'breached').length})
        </Button>
      </div>

      {/* SLA Alerts */}
      {filteredData.filter(item => item.sla_status === 'breached').length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {filteredData.filter(item => item.sla_status === 'breached').length} complaints have breached SLA
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Handle bulk escalation
                  toast.info('Bulk escalation initiated');
                }}
              >
                <Zap className="h-4 w-4 mr-2" />
                Escalate All
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* SLA Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Tracking Details</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No complaints found for the selected filter
            </div>
          ) : (
            <div className="space-y-4">
              {filteredData.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg ${
                    item.sla_status === 'breached' 
                      ? 'border-red-200 bg-red-50' 
                      : item.sla_status === 'at_risk'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.complaint_number}</span>
                          {getUrgencyBadge(item.urgency_level)}
                          {getSlaStatusBadge(item.sla_status)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Assigned to: {item.assigned_staff_name || 'Unassigned'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getTimeRemainingColor(item.hours_remaining)}`}>
                          {formatTimeRemaining(item.hours_remaining)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.sla_deadline).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.sla_status === 'breached' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEscalate(item.complaint_id)}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Escalate
                          </Button>
                        )}
                        
                        {!item.assigned_staff_name && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssign(item.complaint_id)}
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Assign
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/complaints/${item.complaint_id}`}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>SLA Progress</span>
                      <span>
                        {item.hours_remaining > 0 
                          ? `${Math.round((24 - item.hours_remaining) / 24 * 100)}%`
                          : '100%'
                        }
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.sla_status === 'breached' 
                            ? 'bg-red-500' 
                            : item.sla_status === 'at_risk'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, (24 - item.hours_remaining) / 24 * 100))}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SLAMonitoring;
