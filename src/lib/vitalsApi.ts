// API client functions for mobile vitals system
import { api } from './api';

export const vitalsApi = {
  // Submit vitals with validation and anomaly detection
  async submit(vitalsData: any) {
    try {
      const response = await fetch('/api/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Device-ID': localStorage.getItem('device_id') || 'mobile_device',
          'X-Online': 'true'
        },
        body: JSON.stringify(vitalsData)
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting vitals:', error);
      throw error;
    }
  },

  // Get patient vitals history
  async getPatientVitals(patientId: number, options: any = {}) {
    try {
      const params = new URLSearchParams({
        start_date: options.start_date || '',
        end_date: options.end_date || '',
        vital_type: options.vital_type || '',
        limit: options.limit?.toString() || '50',
        offset: options.offset?.toString() || '0',
        include_anomalies: options.include_anomalies?.toString() || 'false'
      });

      const response = await fetch(`/api/vitals/patient/${patientId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching patient vitals:', error);
      throw error;
    }
  },

  // Store vitals offline
  async storeOffline(offlineData: any) {
    try {
      const response = await fetch('/api/vitals/offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(offlineData)
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error storing offline vitals:', error);
      throw error;
    }
  },

  // Get anomalies
  async getAnomalies(options: any = {}) {
    try {
      const params = new URLSearchParams({
        severity: options.severity || 'critical',
        limit: options.limit?.toString() || '100',
        include_resolved: options.include_resolved?.toString() || 'false',
        patient_id: options.patient_id?.toString() || '',
        nurse_id: options.nurse_id?.toString() || ''
      });

      const response = await fetch(`/api/vitals/anomalies?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      throw error;
    }
  },

  // Update vitals
  async updateVitals(vitalId: number, updateData: any) {
    try {
      const response = await fetch(`/api/vitals/${vitalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating vitals:', error);
      throw error;
    }
  },

  // Get sync status
  async getSyncStatus(deviceId: string) {
    try {
      const response = await fetch(`/api/vitals/sync/status?device_id=${deviceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  },

  // Sync offline vitals
  async syncOffline(deviceId: string) {
    try {
      const response = await fetch('/api/vitals/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ device_id: deviceId })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error syncing offline vitals:', error);
      throw error;
    }
  },

  // Get vital trends
  async getVitalTrends(patientId: number, options: any = {}) {
    try {
      const params = new URLSearchParams({
        vital_type: options.vital_type || '',
        days: options.days?.toString() || '30',
        include_predictions: options.include_predictions?.toString() || 'false'
      });

      const response = await fetch(`/api/vitals/trends/${patientId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching vital trends:', error);
      throw error;
    }
  },

  // Bulk create vitals
  async bulkCreateVitals(vitalsDataArray: any[]) {
    try {
      const response = await fetch('/api/vitals/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ vitals_data: vitalsDataArray })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating bulk vitals:', error);
      throw error;
    }
  },

  // Sync with EMR
  async syncWithEMR(patientId: number) {
    try {
      const response = await fetch(`/api/vitals/emr/sync/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error syncing with EMR:', error);
      throw error;
    }
  },

  // Acknowledge anomaly
  async acknowledgeAnomaly(anomalyId: number, notes: string) {
    try {
      const response = await fetch(`/api/vitals/anomalies/${anomalyId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error acknowledging anomaly:', error);
      throw error;
    }
  },

  // Resolve anomaly
  async resolveAnomaly(anomalyId: number, resolutionData: any) {
    try {
      const response = await fetch(`/api/vitals/anomalies/${anomalyId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(resolutionData)
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error resolving anomaly:', error);
      throw error;
    }
  },

  // Get dashboard data
  async getDashboard(options: any = {}) {
    try {
      const params = new URLSearchParams({
        ward_id: options.ward_id?.toString() || '',
        nurse_id: options.nurse_id?.toString() || '',
        time_period: options.time_period || '24h'
      });

      const response = await fetch(`/api/vitals/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
};

// Offline sync service
export class OfflineSyncService {
  private dbName = 'VitalsOfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create vitals store
        if (!db.objectStoreNames.contains('vitals')) {
          const vitalsStore = db.createObjectStore('vitals', { keyPath: 'id', autoIncrement: true });
          vitalsStore.createIndex('patient_id', 'patient_id', { unique: false });
          vitalsStore.createIndex('timestamp', 'timestamp', { unique: false });
          vitalsStore.createIndex('sync_status', 'sync_status', { unique: false });
        }
        
        // Create sync logs store
        if (!db.objectStoreNames.contains('sync_logs')) {
          const syncStore = db.createObjectStore('sync_logs', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async storeVitals(vitalsData: any) {
    if (!this.db) await this.init();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['vitals'], 'readwrite');
      const store = transaction.objectStore('vitals');
      
      const data = {
        ...vitalsData,
        timestamp: new Date().toISOString(),
        sync_status: 'pending',
        device_id: localStorage.getItem('device_id') || 'mobile_device'
      };
      
      const request = store.add(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingVitals() {
    if (!this.db) await this.init();
    
    return new Promise<any[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['vitals'], 'readonly');
      const store = transaction.objectStore('vitals');
      const index = store.index('sync_status');
      const request = index.getAll('pending');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markVitalsAsSynced(vitalId: number) {
    if (!this.db) await this.init();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['vitals'], 'readwrite');
      const store = transaction.objectStore('vitals');
      const request = store.get(vitalId);
      
      request.onsuccess = () => {
        const vital = request.result;
        if (vital) {
          vital.sync_status = 'synced';
          vital.synced_at = new Date().toISOString();
          
          const updateRequest = store.put(vital);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncedVitals() {
    if (!this.db) await this.init();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['vitals'], 'readwrite');
      const store = transaction.objectStore('vitals');
      const index = store.index('sync_status');
      const request = index.getAll('synced');
      
      request.onsuccess = () => {
        const syncedVitals = request.result;
        const deletePromises = syncedVitals.map(vital => {
          return new Promise<void>((resolveDelete, rejectDelete) => {
            const deleteRequest = store.delete(vital.id);
            deleteRequest.onsuccess = () => resolveDelete();
            deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
          });
        });
        
        Promise.all(deletePromises)
          .then(() => resolve())
          .catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async logSyncAttempt(status: string, error?: string) {
    if (!this.db) await this.init();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_logs'], 'readwrite');
      const store = transaction.objectStore('sync_logs');
      
      const logData = {
        timestamp: new Date().toISOString(),
        status,
        error: error || null,
        device_id: localStorage.getItem('device_id') || 'mobile_device'
      };
      
      const request = store.add(logData);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Service Worker for background sync
export class VitalsServiceWorker {
  private registration: ServiceWorkerRegistration | null = null;

  async register() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw-vitals.js');
        console.log('Vitals Service Worker registered');
        return this.registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    } else {
      throw new Error('Service Workers not supported');
    }
  }

  async requestBackgroundSync() {
    if (this.registration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.registration.sync.register('vitals-sync');
        console.log('Background sync requested');
      } catch (error) {
        console.error('Background sync registration failed:', error);
        throw error;
      }
    } else {
      throw new Error('Background sync not supported');
    }
  }

  async getRegistration() {
    if (!this.registration) {
      this.registration = await navigator.serviceWorker.ready;
    }
    return this.registration;
  }
}

// Export the API
export { vitalsApi as api };
