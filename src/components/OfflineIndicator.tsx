import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Database,
  Cloud,
  CloudOff,
  Loader2,
  Sync,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SyncStatus {
  is_online: boolean;
  pending_sync_count: number;
  last_sync_time: string | null;
  sync_status: 'pending' | 'synced' | 'failed' | 'conflict';
  failed_sync_count: number;
  device_id: string;
}

interface OfflineIndicatorProps {
  deviceId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  onSyncComplete?: (result: any) => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  deviceId,
  autoRefresh = true,
  refreshInterval = 5000,
  showDetails = true,
  onSyncComplete
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const device_id = deviceId || localStorage.getItem('device_id') || 'mobile_device';

  const checkSyncStatus = async () => {
    try {
      const response = await api.vitals.getSyncStatus(device_id);
      
      if (response.success) {
        setSyncStatus(response.data);
        setError(null);
      } else {
        setError('Failed to check sync status');
      }
    } catch (err) {
      console.error('Error checking sync status:', err);
      setError('Failed to check sync status');
    } finally {
      setLastChecked(new Date());
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('You are currently offline. Please connect to the internet to sync.');
      return;
    }

    setIsSyncing(true);
    toast.info('Initiating sync...');

    try {
      const response = await api.vitals.syncOffline(device_id);
      
      if (response.success) {
        toast.success('Offline data synced successfully!');
        await checkSyncStatus(); // Refresh status
        if (onSyncComplete) {
          onSyncComplete(response.data);
        }
      } else {
        toast.error(response.message || 'Failed to sync offline data');
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
      toast.error('An error occurred during sync. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:3001/vitals-updates');
      
      ws.onopen = () => {
        console.log('WebSocket connected for sync updates');
        setIsConnected(true);
        
        // Subscribe to sync updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          device_id: device_id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'sync_update') {
            // Handle sync status updates
            setSyncStatus(prev => prev ? { ...prev, ...data.data } : null);
          } else if (data.type === 'sync_complete') {
            // Handle sync completion
            toast.success('Background sync completed');
            checkSyncStatus();
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
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (syncStatus && syncStatus.pending_sync_count > 0) {
        setTimeout(handleManualSync, 1000);
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus]);

  useEffect(() => {
    checkSyncStatus();
    
    if (autoRefresh) {
      setupWebSocket();
    }

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(checkSyncStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'conflict': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'conflict': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSyncStatusText = (status: string) => {
    switch (status) {
      case 'synced': return 'Synced';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      case 'conflict': return 'Conflict';
      default: return 'Unknown';
    }
  };

  const getConnectionStatus = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        text: 'Offline',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    if (syncStatus?.sync_status === 'synced') {
      return {
        icon: <Wifi className="h-4 w-4" />,
        text: 'Online & Synced',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    if (syncStatus?.pending_sync_count > 0) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        text: 'Online - Pending Sync',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }

    return {
      icon: <Wifi className="h-4 w-4" />,
      text: 'Online',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="max-w-md mx-auto">
      <Card className={`border-l-4 ${connectionStatus.borderColor}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {connectionStatus.icon}
              <span>Sync Status</span>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge variant="outline" className="text-green-600">
                  <Cloud className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
              {!isConnected && (
                <Badge variant="outline" className="text-red-600">
                  <CloudOff className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Connection Status */}
          <div className={`p-3 rounded-lg ${connectionStatus.bgColor} mb-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {connectionStatus.icon}
                <span className={`font-semibold ${connectionStatus.color}`}>
                  {connectionStatus.text}
                </span>
              </div>
              {lastChecked && (
                <span className="text-xs text-gray-500">
                  {lastChecked.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sync Details */}
          {showDetails && syncStatus && (
            <div className="space-y-3">
              {/* Sync Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sync Status:</span>
                <div className="flex items-center gap-2">
                  {getSyncStatusIcon(syncStatus.sync_status)}
                  <span className={`text-sm font-semibold ${getSyncStatusColor(syncStatus.sync_status)}`}>
                    {getSyncStatusText(syncStatus.sync_status)}
                  </span>
                </div>
              </div>

              {/* Pending Sync Count */}
              {syncStatus.pending_sync_count > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Sync:</span>
                  <Badge variant="outline" className="text-yellow-600">
                    {syncStatus.pending_sync_count} items
                  </Badge>
                </div>
              )}

              {/* Failed Sync Count */}
              {syncStatus.failed_sync_count > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Failed Sync:</span>
                  <Badge variant="outline" className="text-red-600">
                    {syncStatus.failed_sync_count} items
                  </Badge>
                </div>
              )}

              {/* Last Sync Time */}
              {syncStatus.last_sync_time && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Sync:</span>
                  <span className="text-sm text-gray-500">
                    {new Date(syncStatus.last_sync_time).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Device ID */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Device ID:</span>
                <span className="text-sm text-gray-500 font-mono">
                  {device_id.substring(0, 8)}...
                </span>
              </div>
            </div>
          )}

          {/* Sync Progress */}
          {isSyncing && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Syncing offline data...</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={checkSyncStatus}
              disabled={isSyncing}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            
            <Button
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing || (syncStatus?.pending_sync_count === 0)}
              className="min-w-[100px]"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Sync className="h-4 w-4 mr-1" />
                  Sync Now
                </>
              )}
            </Button>
          </div>

          {/* Offline Warning */}
          {!isOnline && (
            <Alert className="mt-4">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You are offline. Data will be saved locally and synced when you reconnect.
              </AlertDescription>
            </Alert>
          )}

          {/* No Pending Sync */}
          {isOnline && syncStatus?.pending_sync_count === 0 && (
            <div className="mt-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-600 font-semibold">
                All data is synced
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineIndicator;
