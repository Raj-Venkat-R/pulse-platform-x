// Service Worker for mobile vitals system
// This file should be placed in the public directory as sw-vitals.js

const CACHE_NAME = 'vitals-cache-v1';
const OFFLINE_VITALS_KEY = 'offline_vitals';
const SYNC_QUEUE_KEY = 'sync_queue';

// Install event: cache static assets
self.addEventListener('install', event => {
  console.log('Vitals Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Vitals cache opened');
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json',
          // Add other critical assets here
        ]);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  console.log('Vitals Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: serve from cache first, then network
self.addEventListener('fetch', event => {
  // Only handle vitals-related requests
  if (event.request.url.includes('/api/vitals')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached response if available
          if (response) {
            return response;
          }
          
          // If offline, return cached data or store for later sync
          if (!navigator.onLine) {
            return handleOfflineVitalsRequest(event.request);
          }
          
          // Fetch from network
          return fetch(event.request)
            .then(networkResponse => {
              // Cache successful responses
              if (networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseClone);
                  });
              }
              return networkResponse;
            })
            .catch(error => {
              console.error('Network fetch failed:', error);
              return handleOfflineVitalsRequest(event.request);
            });
        })
    );
  }
});

// Handle offline vitals requests
async function handleOfflineVitalsRequest(request) {
  const url = new URL(request.url);
  
  if (request.method === 'POST' && url.pathname === '/api/vitals') {
    // Store vitals offline
    try {
      const vitalsData = await request.json();
      await storeOfflineVitals(vitalsData);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Vitals stored offline',
        data: { offline: true, timestamp: new Date().toISOString() }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error storing offline vitals:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to store vitals offline'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // For GET requests, try to return cached data
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return offline message
  return new Response(JSON.stringify({
    success: false,
    message: 'You are offline. Data will be synced when you reconnect.',
    offline: true
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Store vitals offline
async function storeOfflineVitals(vitalsData) {
  try {
    // Get existing offline vitals
    const existingData = await getOfflineVitals();
    
    // Add new vitals data
    const newVitals = {
      ...vitalsData,
      timestamp: new Date().toISOString(),
      sync_status: 'pending',
      device_id: 'mobile_device' // This should be passed from the client
    };
    
    existingData.push(newVitals);
    
    // Store back to IndexedDB
    await setOfflineVitals(existingData);
    
    console.log('Vitals stored offline:', newVitals);
  } catch (error) {
    console.error('Error storing offline vitals:', error);
    throw error;
  }
}

// Get offline vitals from IndexedDB
async function getOfflineVitals() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VitalsOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['vitals'], 'readonly');
      const store = transaction.objectStore('vitals');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('vitals')) {
        db.createObjectStore('vitals', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Set offline vitals in IndexedDB
async function setOfflineVitals(vitalsData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VitalsOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['vitals'], 'readwrite');
      const store = transaction.objectStore('vitals');
      
      // Clear existing data
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // Add new data
        const addPromises = vitalsData.map(vital => {
          return new Promise((resolveAdd, rejectAdd) => {
            const addRequest = store.add(vital);
            addRequest.onsuccess = () => resolveAdd();
            addRequest.onerror = () => rejectAdd(addRequest.error);
          });
        });
        
        Promise.all(addPromises)
          .then(() => resolve())
          .catch(reject);
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('vitals')) {
        db.createObjectStore('vitals', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Background sync event
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'vitals-sync') {
    event.waitUntil(syncOfflineVitals());
  }
});

// Sync offline vitals when back online
async function syncOfflineVitals() {
  console.log('Syncing offline vitals...');
  
  try {
    // Get offline vitals
    const offlineVitals = await getOfflineVitals();
    
    if (offlineVitals.length === 0) {
      console.log('No offline vitals to sync');
      return;
    }
    
    console.log(`Syncing ${offlineVitals.length} offline vitals`);
    
    // Sync each vital
    const syncPromises = offlineVitals.map(vital => syncVital(vital));
    const results = await Promise.allSettled(syncPromises);
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Sync completed: ${successful} successful, ${failed} failed`);
    
    // Notify clients of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        successful,
        failed,
        total: offlineVitals.length
      });
    });
    
  } catch (error) {
    console.error('Error syncing offline vitals:', error);
    
    // Notify clients of sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_FAILED',
        error: error.message
      });
    });
  }
}

// Sync individual vital
async function syncVital(vital) {
  try {
    const response = await fetch('/api/vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Device-ID': vital.device_id || 'mobile_device',
        'X-Online': 'true'
      },
      body: JSON.stringify(vital)
    });
    
    if (response.ok) {
      console.log('Vital synced successfully:', vital.id);
      return { success: true, vital };
    } else {
      throw new Error(`Sync failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error syncing vital:', vital.id, error);
    throw error;
  }
}

// Message event: handle messages from clients
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_OFFLINE_VITALS':
      getOfflineVitals().then(vitals => {
        event.ports[0].postMessage({
          type: 'OFFLINE_VITALS',
          data: vitals
        });
      });
      break;
      
    case 'CLEAR_OFFLINE_VITALS':
      clearOfflineVitals().then(() => {
        event.ports[0].postMessage({
          type: 'OFFLINE_VITALS_CLEARED'
        });
      });
      break;
      
    case 'FORCE_SYNC':
      syncOfflineVitals().then(() => {
        event.ports[0].postMessage({
          type: 'SYNC_COMPLETE'
        });
      });
      break;
  }
});

// Clear offline vitals
async function clearOfflineVitals() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VitalsOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['vitals'], 'readwrite');
      const store = transaction.objectStore('vitals');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

// Push event: handle push notifications
self.addEventListener('push', event => {
  console.log('Push notification received:', event.data);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New vital anomaly detected',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'vitals-alert',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Vitals Alert', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to view details
    event.waitUntil(
      clients.openWindow('/vitals/dashboard')
    );
  }
});

console.log('Vitals Service Worker loaded');
