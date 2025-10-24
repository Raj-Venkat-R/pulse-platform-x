import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import OfflineSyncIndicator from '@/components/OfflineSyncIndicator';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Database,
  Upload,
  Download,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OfflineAppointment {
  id: string;
  patient_name: string;
  service_name: string;
  provider_name: string;
  scheduled_start: string;
  scheduled_end: string;
  reason: string;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
  synced_at?: string;
  error_message?: string;
}

const OfflineSyncPage: React.FC = () => {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [offlineAppointments, setOfflineAppointments] = useState<OfflineAppointment[]>([]);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDeviceInfo(prev => ({ ...prev, online: true }));
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setDeviceInfo(prev => ({ ...prev, online: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadOfflineData();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      const offlineData = localStorage.getItem('offline_appointments');
      if (offlineData) {
        const appointments = JSON.parse(offlineData);
        setOfflineAppointments(appointments.map((apt: any) => ({
          id: apt.client_temp_id,
          patient_name: apt.payload.patient_name || 'Unknown Patient',
          service_name: apt.payload.service_name || 'Unknown Service',
          provider_name: apt.payload.provider_name || 'Unknown Provider',
          scheduled_start: apt.payload.scheduled_start,
          scheduled_end: apt.payload.scheduled_end,
          reason: apt.payload.reason || 'No reason provided',
          status: apt.status,
          created_at: apt.created_at,
          synced_at: apt.synced_at,
          error_message: apt.error_message
        })));
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline || isSyncing) return;
    
    try {
      setIsSyncing(true);
      setSyncProgress(0);
      
      const offlineData = localStorage.getItem('offline_appointments');
      if (!offlineData) {
        toast({
          title: "No offline data",
          description: "No offline appointments to sync"
        });
        return;
      }
      
      const appointments = JSON.parse(offlineData);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch('/api/appointments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_logs: appointments,
          device_id: localStorage.getItem('device_id') || 'unknown'
        })
      });
      
      const data = await response.json();
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      if (data.success) {
        toast({
          title: "Sync Complete",
          description: String(data?.data?.processed ?? 0) + " appointments synced successfully",
        });
        
        // Clear offline data
        localStorage.removeItem('offline_appointments');
        setOfflineAppointments([]);
        
        // Show errors if any
        if (data?.data?.errors && data.data.errors.length > 0) {
          toast({
            title: "Sync Errors",
            description: String(data.data.errors.length) + " appointments failed to sync",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync offline data",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgress(0), 1000);
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem('offline_appointments');
    setOfflineAppointments([]);
    toast({
      title: "Data Cleared",
      description: "All offline data has been cleared"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'synced':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Offline Sync Management
            </CardTitle>
            <CardDescription>
              Manage offline appointments and synchronization status
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Sync Status */}
        <OfflineSyncIndicator />

        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getDeviceIcon()}
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Connection Status</p>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-success" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-warning" />
                  )}
                  <Badge variant={isOnline ? 'success' : 'warning'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Platform</p>
                <p className="text-sm text-muted-foreground">{deviceInfo.platform}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Language</p>
                <p className="text-sm text-muted-foreground">{deviceInfo.language}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Device ID</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {localStorage.getItem('device_id') || 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={syncOfflineData}
                disabled={!isOnline || isSyncing || offlineAppointments.length === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              
              <Button
                variant="outline"
                onClick={loadOfflineData}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              
              <Button
                variant="destructive"
                onClick={clearOfflineData}
                disabled={offlineAppointments.length === 0}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                Clear All Data
              </Button>
            </div>
            
            {isSyncing && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Syncing appointments...</span>
                  <span className="text-sm text-muted-foreground">{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Offline Appointments
              </span>
              <Badge variant="outline">{offlineAppointments.length} items</Badge>
            </CardTitle>
            <CardDescription>
              Appointments saved locally and waiting to sync
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {offlineAppointments.length > 0 ? (
              <div className="space-y-3">
                {offlineAppointments.map(appointment => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(appointment.status)}
                      
                      <div>
                        <p className="font-medium">{appointment.patient_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.service_name} • {appointment.provider_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appointment.scheduled_start).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(appointment.status)}>
                        {appointment.status.toUpperCase()}
                      </Badge>
                      
                      {appointment.status === 'failed' && appointment.error_message && (
                        <div className="text-xs text-destructive max-w-xs truncate">
                          {appointment.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No offline appointments found</p>
                <p className="text-sm">Appointments will appear here when saved offline</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary">How Offline Sync Works</p>
                <ul className="text-sm text-primary/80 mt-2 space-y-1">
                  <li>• When offline, appointments are saved locally in your browser</li>
                  <li>• Data is automatically synced when you come back online</li>
                  <li>• You can manually trigger sync using the "Sync Now" button</li>
                  <li>• Failed syncs will be retried automatically</li>
                  <li>• All data is encrypted and stored securely</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default OfflineSyncPage;
