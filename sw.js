// Service Worker for ResQ PWA
// Handles robust caching (for offline functionality) and push notifications.

const CACHE_NAME = "resq-cache-v10"; // NEW VERSION! Incrementing version to ensure all caches are updated
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
    '/icons/resq-192.png', // Ensure this path is correct
    '/icons/resq-72.png', // Badge icon path (make sure you have this icon!)
    '/countdown.wav', 
    '/success.mp3',   
    // Critical external dependency for icons
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', 
    // Supabase SDK dependency for offline shell
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.3/+esm' 
];

// ------------------------------------------------------------------
// --- PWA LIFECYCLE & CACHING (Your original logic, updated cache name) ---
// ------------------------------------------------------------------

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
    const isPwaAsset = ASSETS.includes(requestUrl.pathname) || 
                       ASSETS.includes(event.request.url) ||
                       (requestUrl.origin === self.location.origin && event.request.method === 'GET' && !requestUrl.pathname.startsWith('/api/') && !requestUrl.pathname.startsWith('/rest/')); // Exclude Supabase API paths

    if (isPwaAsset) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                
                const networkResponsePromise = fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => {}); // Catch network failure

                const cachedResponse = await cache.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                return networkResponsePromise.catch(() => {
                    console.log('Network failed and no cached asset, falling back to index.');
                    return cache.match('/index.html') || cache.match('/'); 
                });
            })
        );
        return; 
    }

    // 2. Network-Only Strategy for All Other Requests (Supabase API, Storage, POSTs)
    // Handled by default if no event.respondWith is called
});


// -----------------------------------------------------------------
// --- PUSH NOTIFICATIONS LOGIC (The Core Feature Update) ---
// -----------------------------------------------------------------

// 1. PUSH EVENT: Fired when a push message is received from the server
self.addEventListener('push', function(event) {
    // The data sent from your server. We expect { message: string, url: string }
    const data = event.data ? event.data.json() : { 
        message: 'A new critical alert has been issued.', 
        url: '/broadcasts.html' 
    };
    
    console.log('Push received:', data);

    const title = '🚨 ResQ Emergency Alert';
    const options = {
        body: data.message, 
        icon: '/icons/resq-192.png', 
        badge: '/icons/resq-72.png', // A smaller icon is often used for the badge
        vibrate: [200, 100, 200, 100, 200], // More noticeable vibration pattern
        data: {
            url: data.url || '/broadcasts.html' // The page to open on click
        }
    };

    // Keep the service worker alive until the notification is shown
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});


// 2. NOTIFICATION CLICK EVENT: Fired when the user taps the notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const targetUrl = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // Check if the target URL is part of the existing client URL
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus(); // Focus existing tab
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl); // Open new tab
            }
        })
    );
});