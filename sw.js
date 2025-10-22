const CACHE_NAME = "resq-cache-v7"; // Incrementing version
const ASSETS = [
    '/',
    '/index.html',
    '/register.html',
    '/home.html',
    '/profile.html', 
    '/about.html',
    '/report.html', 
    '/history.html', 
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icons/resq-192.png',
    '/countdown.wav', 
    '/success.mp3',   
    // Critical external dependency for icons
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', 
    // Supabase SDK dependency for offline shell (NEW)
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
    const isPwaAsset = ASSETS.includes(requestUrl.pathname) || 
                       ASSETS.includes(event.request.url) ||
                       requestUrl.origin === self.location.origin;

    // Check if the request is an asset we want to cache-first
    if (isPwaAsset) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Return cached response or fetch from network (and potentially cache it)
                return response || fetch(event.request).catch(() => {
                    // Fallback for failed fetches
                    return caches.match('/'); // Return index page as a last resort
                });
            })
        );
        return; 
    }

    // 2. Network-Only Strategy for All Other Requests (Supabase API, Storage, etc.)
    // Note: Data persistence (History/Reports) is handled by LocalStorage in app.js
});