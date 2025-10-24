import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  BellOff,
  X,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AnomalyAlert {
  id: number;
  vital_id: number;
  patient_id: number;
  patient_name: string;
  detected_anomaly: string;
  vital_type: string;
  measured_value: number;
  normal_range_min: number;
  normal_range_max: number;
  deviation_percentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  clinical_significance: string;
  alert_sent: boolean;
  alert_acknowledged: boolean;
  alert_acknowledged_by: number | null;
  alert_acknowledged_at: string | null;
  resolved: boolean;
  created_at: string;
  vital_timestamp: string;
  nurse_name: string;
}

interface AnomalyAlertsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showResolved?: boolean;
  maxAlerts?: number;
}

const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({
  autoRefresh = true,
  refreshInterval = 10000,
  showResolved = false,
  maxAlerts = 50
}) => {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.vitals.getAnomalies({
        severity: 'critical',
        limit: maxAlerts,
        include_resolved: showResolved
      });

      if (response.success) {
        setAlerts(response.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError('Failed to fetch anomaly alerts');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to fetch anomaly alerts');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:3001/vitals-updates');
      
      ws.onopen = () => {
        console.log('WebSocket connected for anomaly alerts');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'critical_vital_anomaly') {
            // Handle real-time anomaly alerts
            toast.error(`Critical vital anomaly detected for ${data.patient_name}`);
            fetchAlerts(); // Refresh alerts
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (autoRefresh) {
            setupWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setWsConnection(ws);
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    if (autoRefresh) {
      setupWebSocket();
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getClinicalSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'life_threatening': return 'text-red-600';
      case 'severe': return 'text-orange-600';
      case 'moderate': return 'text-yellow-600';
      case 'mild': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      const response = await api.vitals.acknowledgeAnomaly(alertId, {
        notes: 'Alert acknowledged by user'
      });

      if (response.success) {
        toast.success('Alert acknowledged');
        fetchAlerts(); // Refresh alerts
      } else {
        toast.error('Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      const response = await api.vitals.resolveAnomaly(alertId, {
        resolution_notes: 'Anomaly resolved',
        action_taken: 'Patient monitored and condition stabilized'
      });

      if (response.success) {
        toast.success('Alert resolved');
        fetchAlerts(); // Refresh alerts
      } else {
        toast.error('Failed to resolve alert');
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const handleDismissAlert = (alertId: number) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const handleRefresh = () => {
    fetchAlerts();
  };

  const filteredAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));
  const criticalAlerts = filteredAlerts.filter(alert => alert.severity === 'critical');
  const unacknowledgedAlerts = filteredAlerts.filter(alert => !alert.alert_acknowledged);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Anomaly Alerts
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {!isOnline && (
                <Badge variant="destructive">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
          
          {lastUpdated && (
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">Critical</span>
              </div>
              <p className="text-2xl font-bold text-red-800">{criticalAlerts.length}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-orange-800">Unacknowledged</span>
              </div>
              <p className="text-2xl font-bold text-orange-800">{unacknowledgedAlerts.length}</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Total Alerts</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">{filteredAlerts.length}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Resolved</span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                {alerts.filter(alert => alert.resolved).length}
              </p>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading alerts...
            </div>
          )}

          {/* Alerts List */}
          {!loading && !error && (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <Card 
                  key={alert.id} 
                  className={`border-l-4 ${
                    alert.severity === 'critical' ? 'border-l-red-500' :
                    alert.severity === 'high' ? 'border-l-orange-500' :
                    alert.severity === 'medium' ? 'border-l-yellow-500' :
                    'border-l-blue-500'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <h3 className="font-semibold text-lg">{alert.patient_name}</h3>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!alert.alert_acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        
                        {!alert.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismissAlert(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      Nurse: {alert.nurse_name} • 
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Anomaly Details</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Type:</strong> {alert.vital_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Detected:</strong> {alert.detected_anomaly}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Value:</strong> {alert.measured_value} 
                          {alert.vital_type === 'bp_systolic' || alert.vital_type === 'bp_diastolic' ? ' mmHg' :
                           alert.vital_type === 'heart_rate' ? ' bpm' :
                           alert.vital_type === 'temperature' ? '°C' :
                           alert.vital_type === 'spo2' ? '%' :
                           alert.vital_type === 'respiratory_rate' ? ' breaths/min' : ''}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Normal Range:</strong> {alert.normal_range_min} - {alert.normal_range_max}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Analysis</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Deviation:</strong> {alert.deviation_percentage.toFixed(1)}%
                        </p>
                        <p className={`text-sm font-semibold mb-2 ${getClinicalSignificanceColor(alert.clinical_significance)}`}>
                          <strong>Clinical Significance:</strong> {alert.clinical_significance.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Status:</strong> {
                            alert.resolved ? 'Resolved' :
                            alert.alert_acknowledged ? 'Acknowledged' :
                            'Pending'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {alert.alert_acknowledged && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                        {alert.resolved && (
                          <Badge variant="outline" className="text-blue-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Navigate to patient vitals or details
                            console.log('View patient details for:', alert.patient_id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Patient
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAlerts.length === 0 && (
            <div className="text-center py-8">
              <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No alerts</h3>
              <p className="text-gray-500">
                {showResolved 
                  ? 'No anomaly alerts found'
                  : 'No active anomaly alerts found'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnomalyAlerts;
