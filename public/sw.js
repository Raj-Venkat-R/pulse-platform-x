// Service Worker for Offline Appointment Management
const CACHE_NAME = 'appointment-system-v1';
const OFFLINE_CACHE = 'offline-data-v1';

// Files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching essential files');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle static assets
  else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  }
  // Handle navigation requests
  else if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  }
});

// Handle API requests with offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, cache the response for future offline use
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(OFFLINE_CACHE);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, trying cache:', url.pathname);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Handle specific API endpoints offline
    if (url.pathname.startsWith('/api/appointments/')) {
      return handleOfflineAppointmentRequest(request);
    }
    
    if (url.pathname.startsWith('/api/queue/')) {
      return handleOfflineQueueRequest(request);
    }
    
    // Return offline response for other API calls
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Offline - data will be synced when online',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle offline appointment requests
async function handleOfflineAppointmentRequest(request) {
  const url = new URL(request.url);
  
  if (request.method === 'POST' && url.pathname === '/api/appointments/book') {
    // Store appointment data locally for later sync
    const appointmentData = await request.json();
    await storeOfflineAppointment(appointmentData);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Appointment stored offline - will be synced when online',
        offline: true,
        appointment_id: `offline_${Date.now()}`
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (request.method === 'GET' && url.pathname.startsWith('/api/appointments/')) {
    // Return cached appointments
    const appointments = await getOfflineAppointments();
    return new Response(
      JSON.stringify({
        success: true,
        data: appointments,
        offline: true
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Offline - operation not supported',
      offline: true
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Handle offline queue requests
async function handleOfflineQueueRequest(request) {
  const url = new URL(request.url);
  
  if (request.method === 'POST' && url.pathname === '/api/queue/join') {
    // Store queue entry locally
    const queueData = await request.json();
    await storeOfflineQueueEntry(queueData);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Queue entry stored offline - will be synced when online',
        offline: true,
        token_number: `offline_${Date.now()}`
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (request.method === 'GET' && url.pathname === '/api/queue/current') {
    // Return cached queue data
    const queueData = await getOfflineQueueData();
    return new Response(
      JSON.stringify({
        success: true,
        data: queueData,
        offline: true
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Offline - queue operations not available',
      offline: true
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Handle static assets
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Static asset not available:', request.url);
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached page or offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg')
  );
}

// Store appointment data offline
async function storeOfflineAppointment(appointmentData) {
  try {
    const offlineData = await getOfflineData();
    const appointment = {
      id: `offline_${Date.now()}`,
      type: 'appointment',
      action: 'create',
      data: appointmentData,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    offlineData.push(appointment);
    await setOfflineData(offlineData);
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'OFFLINE_APPOINTMENT_STORED',
          data: appointment
        });
      });
    });
  } catch (error) {
    console.error('Error storing offline appointment:', error);
  }
}

// Store queue entry offline
async function storeOfflineQueueEntry(queueData) {
  try {
    const offlineData = await getOfflineData();
    const queueEntry = {
      id: `offline_${Date.now()}`,
      type: 'queue',
      action: 'create',
      data: queueData,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    offlineData.push(queueEntry);
    await setOfflineData(offlineData);
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'OFFLINE_QUEUE_STORED',
          data: queueEntry
        });
      });
    });
  } catch (error) {
    console.error('Error storing offline queue entry:', error);
  }
}

// Get offline appointments
async function getOfflineAppointments() {
  try {
    const offlineData = await getOfflineData();
    return offlineData.filter(item => item.type === 'appointment');
  } catch (error) {
    console.error('Error getting offline appointments:', error);
    return [];
  }
}

// Get offline queue data
async function getOfflineQueueData() {
  try {
    const offlineData = await getOfflineData();
    return offlineData.filter(item => item.type === 'queue');
  } catch (error) {
    console.error('Error getting offline queue data:', error);
    return [];
  }
}

// Get offline data from IndexedDB
async function getOfflineData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineAppointmentDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'id' });
      }
    };
  });
}

// Set offline data in IndexedDB
async function setOfflineData(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineAppointmentDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      
      // Clear existing data
      store.clear();
      
      // Add new data
      data.forEach(item => {
        store.add(item);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'id' });
      }
    };
  });
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'appointment-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when online
async function syncOfflineData() {
  try {
    const offlineData = await getOfflineData();
    const pendingItems = offlineData.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) {
      console.log('No pending items to sync');
      return;
    }
    
    console.log(`Syncing ${pendingItems.length} offline items`);
    
    // Send sync request to server
    const response = await fetch('/api/appointments/offline-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_id: await getDeviceId(),
        sync_data: pendingItems
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Sync completed:', result);
      
      // Update local data
      const updatedData = offlineData.map(item => {
        const syncResult = result.data.find((r: any) => r.id === item.id);
        if (syncResult) {
          return { ...item, status: syncResult.status };
        }
        return item;
      });
      
      await setOfflineData(updatedData);
      
      // Notify main thread
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETED',
            data: result
          });
        });
      });
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Get device ID
async function getDeviceId() {
  return new Promise((resolve) => {
    const request = indexedDB.open('OfflineAppointmentDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['deviceInfo'], 'readonly');
      const store = transaction.objectStore('deviceInfo');
      const getRequest = store.get('device_id');
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result.value);
        } else {
          const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          resolve(deviceId);
        }
      };
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('deviceInfo')) {
        db.createObjectStore('deviceInfo', { keyPath: 'key' });
      }
    };
  });
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New appointment update',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'appointment-update',
    requireInteraction: true,
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
    self.registration.showNotification('Appointment System', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/appointments')
    );
  }
});

console.log('Service Worker loaded successfully');
