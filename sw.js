// Service Worker for ResQ PWA
// Handles robust caching (for offline functionality) and push notifications.

const CACHE_NAME = "resq-cache-v8"; // Incrementing version to ensure updates
const ASSETS = [
    '/',
    '/index.html',
    '/register.html',
    '/home.html',
    '/profile.html', 
    '/about.html',
    '/report.html', 
    '/history.html', 
    '/broadcasts.html', // Added new broadcasts page
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
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache, pre-caching assets');
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

// Fetch: Cache-First strategy for PWA Shell, Network-Only for Data/API
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 1. Cache-First Strategy for PWA Shell Assets
    // Check if the request URL is a PWA asset (either by exact path or by being a cached external URL)
    const isPwaAsset = ASSETS.includes(requestUrl.pathname) || 
                       ASSETS.includes(event.request.url) ||
                       requestUrl.origin === self.location.origin;

    if (isPwaAsset) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Return cached response or fetch from network (and potentially cache it)
                return response || fetch(event.request).catch(() => {
                    // Fallback for failed fetches - return the index page
                    return caches.match('/index.html') || caches.match('/'); 
                });
            })
        );
        return; 
    }

    // 2. Network-Only Strategy for All Other Requests (Supabase API, Storage, etc.)
    // If it's not a shell asset, allow it to go directly to the network without caching.
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