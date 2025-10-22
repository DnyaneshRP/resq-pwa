// Service Worker for ResQ PWA
// The Service Worker handles caching (for offline functionality) and push notifications (for native alerts)

const CACHE_NAME = 'resq-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/home.html',
  '/register.html',
  '/report.html',
  '/history.html',
  '/profile.html',
  '/broadcasts.html', // NEW
  '/style.css',
  '/app.js', 
  // Add other static assets like images, fonts, and audio files (if paths were provided)
  // e.g., '/path/to/success.mp3', '/path/to/alarm.mp3'
];

// 1. Install Event: Cache all essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('ServiceWorker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Fetch Event: Serve from cache first, then fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // No cache hit - fetch from network
        return fetch(event.request);
      }
    )
  );
});

// 3. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('ServiceWorker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


// =================================================================
// PUSH NOTIFICATIONS LOGIC (Task 2)
// =================================================================
// Note: This logic assumes you are using a dedicated WebPush service 
// to send push notifications to the user's browser, as Supabase Realtime
// (used for the in-app listener) cannot trigger off-app PUSH events.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Emergency Alert', body: 'A critical broadcast was sent.', url: '/broadcasts.html' };
  
  const title = data.title;
  const options = {
    body: data.body,
    icon: '/path/to/app-icon-96x96.png', // Replace with your app icon
    badge: '/path/to/app-icon-badge.png', // Replace with your badge icon
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