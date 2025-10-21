const CACHE_NAME = "resq-cache-v6"; // Using your version
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
    // Correct Audio files per your specification
    '/countdown.wav', 
    '/success.mp3',   
    // Critical external dependency for icons
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', 
];
// Installation: Cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache, pre-caching assets');
            // Use a catch block for addAll because external requests might fail
            return cache.addAll(ASSETS).catch(error => {
                console.warn('One or more assets failed to cache (often external resources like Font Awesome):', error);
            });
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
    const requestUrl = new URL(event.request.url);
    const isAsset = ASSETS.includes(requestUrl.pathname) || ASSETS.includes(event.request.url);
    // Only apply Cache-First strategy to our PWA shell assets
    if (requestUrl.origin === self.location.origin || isAsset) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Return cached response or fetch from network
                return response || fetch(event.request);
            })
        );
    }
    // All other requests (like Supabase API calls) go directly to the network
});