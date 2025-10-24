import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Droplets, 
  Wind, 
  Weight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PatientVitals {
  id: number;
  patient_id: number;
  patient_name: string;
  nurse_name: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  pain_level: number | null;
  blood_glucose: number | null;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  has_critical_anomaly: boolean;
  anomaly_count: number;
  created_at: string;
  bp_category: string;
  anomalies?: any[];
}

interface RealTimeVitalsDisplayProps {
  wardId?: number;
  nurseId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const RealTimeVitalsDisplay: React.FC<RealTimeVitalsDisplayProps> = ({
  wardId,
  nurseId,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [vitals, setVitals] = useState<PatientVitals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchVitals = async () => {
    try {
      setLoading(true);
      const response = await api.vitals.getDashboard({
        ward_id: wardId,
        nurse_id: nurseId,
        time_period: '24h'
      });

      if (response.success) {
        setVitals(response.data.critical_vitals || []);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError('Failed to fetch vitals data');
      }
    } catch (err) {
      console.error('Error fetching vitals:', err);
      setError('Failed to fetch vitals data');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:3001/vitals-updates');
      
      ws.onopen = () => {
        console.log('WebSocket connected for vitals updates');
        setIsConnected(true);
        
        // Subscribe to updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          ward_id: wardId,
          nurse_id: nurseId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'critical_vital_anomaly') {
            // Handle real-time anomaly alerts
            toast.error(`Critical vital anomaly detected for ${data.patient_name}`);
            fetchVitals(); // Refresh data
          } else if (data.type === 'vital_update') {
            // Handle general vital updates
            fetchVitals();
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
    fetchVitals();
    
    if (autoRefresh) {
      setupWebSocket();
    }

    // Cleanup WebSocket on unmount
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wardId, nurseId]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchVitals, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'abnormal': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="h-4 w-4" />;
      case 'abnormal': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getVitalIcon = (vitalType: string) => {
    const icons = {
      bp_systolic: Heart,
      bp_diastolic: Heart,
      heart_rate: Activity,
      temperature: Thermometer,
      spo2: Droplets,
      respiratory_rate: Wind,
      weight: Weight
    };
    return icons[vitalType as keyof typeof icons] || Activity;
  };

  const getVitalUnit = (vitalType: string) => {
    const units = {
      bp_systolic: 'mmHg',
      bp_diastolic: 'mmHg',
      heart_rate: 'bpm',
      temperature: '°C',
      spo2: '%',
      respiratory_rate: 'breaths/min',
      weight: 'kg',
      height: 'cm',
      blood_glucose: 'mg/dL'
    };
    return units[vitalType as keyof typeof units] || '';
  };

  const getVitalValue = (vital: PatientVitals, vitalType: string) => {
    switch (vitalType) {
      case 'bp_systolic': return vital.bp_systolic;
      case 'bp_diastolic': return vital.bp_diastolic;
      case 'heart_rate': return vital.heart_rate;
      case 'temperature': return vital.temperature;
      case 'spo2': return vital.spo2;
      case 'respiratory_rate': return vital.respiratory_rate;
      case 'weight': return vital.weight;
      case 'height': return vital.height;
      case 'blood_glucose': return vital.blood_glucose;
      default: return null;
    }
  };

  const getVitalStatus = (vital: PatientVitals, vitalType: string) => {
    const value = getVitalValue(vital, vitalType);
    if (value === null) return 'missing';

    // Simple status determination based on common ranges
    switch (vitalType) {
      case 'bp_systolic':
        if (value < 90 || value > 140) return 'abnormal';
        return 'normal';
      case 'bp_diastolic':
        if (value < 60 || value > 90) return 'abnormal';
        return 'normal';
      case 'heart_rate':
        if (value < 60 || value > 100) return 'abnormal';
        return 'normal';
      case 'temperature':
        if (value < 36.1 || value > 37.2) return 'abnormal';
        return 'normal';
      case 'spo2':
        if (value < 95) return 'abnormal';
        return 'normal';
      case 'respiratory_rate':
        if (value < 12 || value > 20) return 'abnormal';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const filteredVitals = vitals.filter(vital => {
    if (filters.status !== 'all' && vital.status !== filters.status) {
      return false;
    }
    if (filters.search && !vital.patient_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    const aValue = a[filters.sortBy as keyof PatientVitals];
    const bValue = b[filters.sortBy as keyof PatientVitals];
    
    if (filters.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleRefresh = () => {
    fetchVitals();
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-Time Vitals Monitor
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
            </div>
          </div>
          
          {lastUpdated && (
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-1 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="normal">Normal</option>
                <option value="abnormal">Abnormal</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <input
                type="text"
                placeholder="Search patients..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="px-3 py-1 border rounded-md"
              />
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
              Loading vitals...
            </div>
          )}

          {/* Vitals Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVitals.map((vital) => (
                <Card key={vital.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{vital.patient_name}</h3>
                      <Badge className={getStatusColor(vital.status)}>
                        {getStatusIcon(vital.status)}
                        <span className="ml-1">{vital.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Nurse: {vital.nurse_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(vital.created_at).toLocaleString()}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Critical Anomaly Alert */}
                    {vital.has_critical_anomaly && (
                      <Alert className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Critical anomaly detected! Immediate attention required.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Vital Signs Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { type: 'bp_systolic', label: 'Systolic BP' },
                        { type: 'bp_diastolic', label: 'Diastolic BP' },
                        { type: 'heart_rate', label: 'Heart Rate' },
                        { type: 'temperature', label: 'Temperature' },
                        { type: 'spo2', label: 'O2 Sat' },
                        { type: 'respiratory_rate', label: 'Resp Rate' }
                      ].map(({ type, label }) => {
                        const value = getVitalValue(vital, type);
                        const status = getVitalStatus(vital, type);
                        const IconComponent = getVitalIcon(type);
                        const unit = getVitalUnit(type);

                        return (
                          <div key={type} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <IconComponent className="h-4 w-4 text-gray-600" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-600">{label}</p>
                              <p className="font-semibold">
                                {value !== null ? `${value} ${unit}` : 'N/A'}
                              </p>
                            </div>
                            {status === 'abnormal' && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional Info */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span>BMI: {vital.bmi ? vital.bmi.toFixed(1) : 'N/A'}</span>
                        {vital.pain_level !== null && (
                          <span>Pain: {vital.pain_level}/10</span>
                        )}
                      </div>
                      
                      {vital.anomaly_count > 0 && (
                        <div className="mt-2">
                          <Badge variant="destructive" className="text-xs">
                            {vital.anomaly_count} anomaly{vital.anomaly_count > 1 ? 'ies' : ''} detected
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredVitals.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No vitals found</h3>
              <p className="text-gray-500">
                {filters.search || filters.status !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'No vitals data available for the selected criteria'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeVitalsDisplay;
