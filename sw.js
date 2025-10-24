// Service Worker for ResQ PWA
// Handles robust caching (for offline functionality) and push notifications.

const CACHE_NAME = "resq-cache-v9"; // Incrementing version to ensure all caches are updated
const ASSETS = [
    '/',
    '/index.html',
    '/register.html',
    '/home.html',
    '/profile.html', 
    '/about.html',
    '/report.html', 
    '/history.html', 
    '/broadcasts.html', 
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icons/resq-192.png',
    '/countdown.wav', 
    '/success.mp3',   
    // Critical external dependency for icons
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', 
    // Supabase SDK dependency for offline shell
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.3/+esm' 
];

// Installation: Cache all assets (Cache-First)
self.addEventListener('install', (event) => {
    console.log('Opened cache, pre-caching assets');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(error => {
                console.warn('One or more assets failed to cache:', error);
            });
        })
    );
    self.skipWaiting(); 
});

// Activation: Clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Stale-While-Revalidate for PWA Shell, Network-Only for Data/API
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 1. Stale-While-Revalidate Strategy for PWA Shell Assets
    // Check if the request is a GET request for a local or whitelisted external asset
    const isPwaAsset = ASSETS.includes(requestUrl.pathname) || 
                       ASSETS.includes(event.request.url) ||
                       (requestUrl.origin === self.location.origin && event.request.method === 'GET');

    if (isPwaAsset) {
        // Use Stale-While-Revalidate strategy
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                
                // Start the network request in the background
                const networkResponsePromise = fetch(event.request).then((response) => {
                    // Check for valid response (e.g., status 200)
                    if (response && response.status === 200) {
                        // IMPORTANT: Clone the response to save one copy to the cache 
                        // and return the other copy to the browser.
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => {
                    // Handle network failure without cache hit below
                });

                // Check cache first for immediate response
                const cachedResponse = await cache.match(event.request);

                // Return cached response if available (fastest option, even if stale)
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If cache misses, wait for the network response
                return networkResponsePromise.catch(() => {
                    // Network failed AND no cache hit. Use the ultimate offline fallback.
                    console.log('Network failed and no cached asset, falling back to index.');
                    return cache.match('/index.html') || cache.match('/'); 
                });
            })
        );
        return; 
    }

    // 2. Network-Only Strategy for All Other Requests (Supabase API, Storage, POSTs)
    // We do not call event.respondWith, allowing the request to proceed as normal (Network-Only).
    // This is safer for dynamic data.
});


// =================================================================
// PUSH NOTIFICATIONS LOGIC (Retained for PWA features)
// =================================================================

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Emergency Alert', body: 'A critical broadcast was sent.', url: '/broadcasts.html' };
  
  const title = data.title;
  const options = {
    body: data.body,
    icon: '/icons/resq-192.png', 
    badge: '/icons/resq-192.png', 
    vibrate: [500, 100, 500],
    data: {
        url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle the notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/broadcasts.html';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});