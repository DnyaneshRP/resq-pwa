const CACHE_NAME = "resq-cache-v6"; // INCREMENTED VERSION!
const ASSETS = [
    '/',
    '/index.html',
    '/register.html',
    '/home.html',
    '/profile.html', 
    '/about.html',
    '/report.html', // ADDED
    '/history.html', // ADDED
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icons/resq-192.png',
    // You must add your audio files here too!
    // '/countdown.mp3', 
    // '/ting.mp3'
];

// Installation: Cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache, pre-caching assets');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting(); // Forces the new Service Worker to activate immediately
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

// Fetch: Cache-First strategy for the app shell
self.addEventListener('fetch', (event) => {
    // Only respond to requests for assets we want to cache-first
    if (ASSETS.includes(new URL(event.request.url).pathname) || new URL(event.request.url).origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Return cached response or fetch from network
                return response || fetch(event.request);
            })
        );
    }
    // All other requests (e.g., Font Awesome CDN) go directly to the network
});