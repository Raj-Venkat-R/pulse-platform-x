import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Database,
  Upload,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SyncLog {
  id: number;
  entity_type: 'appointment' | 'queue_token' | 'availability_slot';
  entity_id?: number;
  client_temp_id: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

interface SyncData {
  pending_sync_logs: SyncLog[];
  recent_appointments: any[];
  recent_queue_tokens: any[];
  sync_timestamp: string;
}

const OfflineSyncIndicator: React.FC = () => {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [deviceId] = useState(() => {
    // Generate or retrieve device ID
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      setTimeout(() => {
        syncOfflineData();
      }, 1000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load initial sync status
    loadSyncStatus();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSyncStatus = async () => {
    try {
      const response = await fetch(`/api/appointments/sync?device_id=${deviceId}&last_sync=${lastSyncTime || ''}`);
      const data = await response.json();
      
      if (data.success) {
        setPendingSyncCount(data.data.pending_sync_logs.length);
        setSyncLogs(data.data.pending_sync_logs);
        setLastSyncTime(data.data.sync_timestamp);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline || isSyncing) return;
    
    try {
      setIsSyncing(true);
      setSyncProgress(0);
      
      // Get offline data from localStorage
      const offlineData = getOfflineData();
      
      if (offlineData.length === 0) {
        toast({
          title: "No offline data",
          description: "No offline appointments to sync"
        });
        return;
      }
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch('/api/appointments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_logs: offlineData,
          device_id: deviceId
        })
      });
      
      const data = await response.json();
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `${data.data.processed} items synced successfully`
        });
        
        // Clear offline data
        clearOfflineData();
        setPendingSyncCount(0);
        setSyncLogs([]);
        setLastSyncTime(new Date().toISOString());
        
        // Show errors if any
        if (data.data.errors && data.data.errors.length > 0) {
          toast({
            title: "Sync Errors",
            description: `${data.data.errors.length} items failed to sync`,
            variant: "destructive"
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

  const getOfflineData = (): SyncLog[] => {
    try {
      const offlineData = localStorage.getItem('offline_appointments');
      return offlineData ? JSON.parse(offlineData) : [];
    } catch (error) {
      console.error('Error reading offline data:', error);
      return [];
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem('offline_appointments');
  };

  const saveOfflineAppointment = (appointmentData: any) => {
    try {
      const offlineData = getOfflineData();
      const syncLog: SyncLog = {
        id: Date.now(),
        entity_type: 'appointment',
        client_temp_id: `temp_${Date.now()}`,
        operation: 'create',
        payload: appointmentData,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      offlineData.push(syncLog);
      localStorage.setItem('offline_appointments', JSON.stringify(offlineData));
      setPendingSyncCount(offlineData.length);
      setSyncLogs(offlineData);
      
      toast({
        title: "Saved Offline",
        description: "Appointment saved locally and will sync when online"
      });
    } catch (error) {
      console.error('Error saving offline appointment:', error);
      toast({
        title: "Error",
        description: "Failed to save appointment offline",
        variant: "destructive"
      });
    }
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

  return (
    <div className="space-y-4">
      {/* Main Sync Indicator */}
      <Card className={`transition-colors ${!isOnline ? 'border-warning bg-warning/5' : 'border-success bg-success/5'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-success" />
              ) : (
                <WifiOff className="h-5 w-5 text-warning" />
              )}
              
              <div>
                <p className="font-medium">
                  {isOnline ? 'Online' : 'Offline Mode'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOnline 
                    ? pendingSyncCount > 0 
                      ? `${pendingSyncCount} items pending sync`
                      : 'All data synced'
                    : 'Data will be saved locally'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {pendingSyncCount > 0 && (
                <Badge variant="warning">
                  {pendingSyncCount} pending
                </Badge>
              )}
              
              {isOnline && pendingSyncCount > 0 && (
                <Button
                  size="sm"
                  onClick={syncOfflineData}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              )}
            </div>
          </div>
          
          {isSyncing && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Syncing data...</span>
                <span className="text-sm text-muted-foreground">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Logs */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Offline Data
            </CardTitle>
            <CardDescription>
              Items saved locally and waiting to sync
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {syncLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    
                    <div>
                      <p className="font-medium">
                        {log.entity_type === 'appointment' ? 'Appointment' : 
                         log.entity_type === 'queue_token' ? 'Queue Token' : 
                         'Availability Slot'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.operation.toUpperCase()} • {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(log.status)}>
                      {log.status.toUpperCase()}
                    </Badge>
                    
                    {log.status === 'failed' && log.error_message && (
                      <div className="text-xs text-destructive max-w-xs truncate">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Sync Info */}
      {lastSyncTime && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Last sync: {new Date(lastSyncTime).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Instructions */}
      {!isOnline && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">Offline Mode Active</p>
                <p className="text-sm text-warning/80 mt-1">
                  You're currently offline. All appointments and queue tokens will be saved locally 
                  and automatically synced when you're back online.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OfflineSyncIndicator;
