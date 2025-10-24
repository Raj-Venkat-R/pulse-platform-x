import React, { useState, useEffect, useCallback } from 'react';
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
  Upload,
  Download,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface OfflineSyncHandlerProps {
  deviceId?: string;
  autoSync?: boolean;
  onSyncComplete?: (result: any) => void;
}

interface SyncItem {
  id: string;
  type: 'appointment' | 'patient' | 'queue';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed' | 'conflict';
  error?: string;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingItems: number;
  failedItems: number;
  totalItems: number;
}

const OfflineSyncHandler: React.FC<OfflineSyncHandlerProps> = ({
  deviceId,
  autoSync = true,
  onSyncComplete
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingItems: 0,
    failedItems: 0,
    totalItems: 0
  });
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Generate device ID if not provided
  const currentDeviceId = deviceId || getOrCreateDeviceId();

  useEffect(() => {
    // Set up online/offline event listeners
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      if (autoSync) {
        performSync();
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending sync items
    loadPendingSyncItems();

    // Set up periodic sync check
    const syncInterval = setInterval(() => {
      if (navigator.onLine && autoSync) {
        checkForPendingSync();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [autoSync]);

  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const loadPendingSyncItems = () => {
    try {
      const stored = localStorage.getItem('offline_sync_items');
      const items: SyncItem[] = stored ? JSON.parse(stored) : [];
      
      setSyncItems(items);
      
      const pending = items.filter(item => item.status === 'pending').length;
      const failed = items.filter(item => item.status === 'failed').length;
      
      setSyncStatus(prev => ({
        ...prev,
        pendingItems: pending,
        failedItems: failed,
        totalItems: items.length
      }));
    } catch (error) {
      console.error('Error loading sync items:', error);
    }
  };

  const checkForPendingSync = async () => {
    if (syncStatus.pendingItems > 0 || syncStatus.failedItems > 0) {
      await performSync();
    }
  };

  const addSyncItem = (type: SyncItem['type'], action: SyncItem['action'], data: any) => {
    const item: SyncItem = {
      id: `${type}_${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    const updatedItems = [...syncItems, item];
    setSyncItems(updatedItems);
    localStorage.setItem('offline_sync_items', JSON.stringify(updatedItems));
    
    setSyncStatus(prev => ({
      ...prev,
      pendingItems: prev.pendingItems + 1,
      totalItems: prev.totalItems + 1
    }));

    // Auto-sync if online
    if (navigator.onLine && autoSync) {
      performSync();
    }
  };

  const performSync = async () => {
    if (!navigator.onLine) {
      toast.error('No internet connection available');
      return;
    }

    if (syncStatus.pendingItems === 0 && syncStatus.failedItems === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      const pendingItems = syncItems.filter(item => 
        item.status === 'pending' || item.status === 'failed'
      );

      const syncData = {
        device_id: currentDeviceId,
        sync_items: pendingItems.map(item => ({
          id: item.id,
          type: item.type,
          action: item.action,
          data: item.data,
          timestamp: item.timestamp
        }))
      };

      const response = await api.appointments.syncOffline(syncData);
      
      if (response.success) {
        // Update sync status for each item
        const updatedItems = syncItems.map(item => {
          const result = response.data.find((r: any) => r.id === item.id);
          if (result) {
            return {
              ...item,
              status: result.status,
              error: result.error
            };
          }
          return item;
        });

        setSyncItems(updatedItems);
        localStorage.setItem('offline_sync_items', JSON.stringify(updatedItems));

        // Update sync status
        const syncedItems = updatedItems.filter(item => item.status === 'synced');
        const failedItems = updatedItems.filter(item => item.status === 'failed');
        
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          pendingItems: 0,
          failedItems: failedItems.length,
          totalItems: updatedItems.length
        }));

        setSyncProgress(100);
        
        toast.success(`Synced ${syncedItems.length} items successfully`);
        
        if (onSyncComplete) {
          onSyncComplete(response.data);
        }
      } else {
        throw new Error(response.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync offline data');
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const retryFailedItems = async () => {
    const failedItems = syncItems.filter(item => item.status === 'failed');
    
    for (const item of failedItems) {
      item.status = 'pending';
    }

    setSyncItems([...syncItems]);
    localStorage.setItem('offline_sync_items', JSON.stringify(syncItems));
    
    setSyncStatus(prev => ({
      ...prev,
      pendingItems: prev.pendingItems + failedItems.length,
      failedItems: 0
    }));

    await performSync();
  };

  const clearSyncedItems = () => {
    const unsyncedItems = syncItems.filter(item => item.status !== 'synced');
    setSyncItems(unsyncedItems);
    localStorage.setItem('offline_sync_items', JSON.stringify(unsyncedItems));
    
    setSyncStatus(prev => ({
      ...prev,
      totalItems: unsyncedItems.length
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      synced: { label: 'Synced', color: 'bg-green-100 text-green-800' },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      conflict: { label: 'Conflict', color: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            Offline Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {syncStatus.totalItems}
              </div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {syncStatus.pendingItems}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {syncStatus.totalItems - syncStatus.pendingItems - syncStatus.failedItems}
              </div>
              <div className="text-sm text-gray-600">Synced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {syncStatus.failedItems}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {syncStatus.lastSync && (
            <div className="text-sm text-gray-600 mb-4">
              Last sync: {syncStatus.lastSync.toLocaleString()}
            </div>
          )}

          {/* Sync Progress */}
          {isSyncing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Syncing...</span>
                <span className="text-sm text-gray-600">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={performSync}
              disabled={!syncStatus.isOnline || isSyncing || syncStatus.pendingItems === 0}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Now
            </Button>
            
            {syncStatus.failedItems > 0 && (
              <Button
                variant="outline"
                onClick={retryFailedItems}
                disabled={!syncStatus.isOnline || isSyncing}
              >
                Retry Failed
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={clearSyncedItems}
              disabled={isSyncing}
            >
              Clear Synced
            </Button>
          </div>

          {/* Offline Warning */}
          {!syncStatus.isOnline && (
            <Alert className="mt-4">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You are currently offline. Changes will be synced when you reconnect.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Items List */}
      {syncItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sync Items ({syncItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {item.type === 'appointment' && <Clock className="h-4 w-4" />}
                      {item.type === 'patient' && <Database className="h-4 w-4" />}
                      {item.type === 'queue' && <Upload className="h-4 w-4" />}
                      <span className="font-medium capitalize">{item.type}</span>
                      <span className="text-sm text-gray-600">({item.action})</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    {item.error && (
                      <AlertTriangle className="h-4 w-4 text-red-500" title={item.error} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Device ID:</span>
              <span className="font-mono text-xs">{currentDeviceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Connection:</span>
              <span className={syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Auto Sync:</span>
              <span>{autoSync ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineSyncHandler;
