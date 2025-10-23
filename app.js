// --- Supabase SDK Imports ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.3/+esm';

// =================================================================
// YOUR SUPABASE CONFIGURATION 
// =================================================================
const SUPABASE_URL = 'https://ayptiehjxxincwsbtysl.supabase.co'; 
// !!! THE CORRECT ANON KEY HAS BEEN RESTORED HERE !!!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cHRpZWhqeHhpbmN3c2J0eXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTY2NzIsImV4cCI6MjA3NjE3MjY3Mn0.jafnb-fxqWbZm7uJf2g17CgiGzS-MetDY1h0kV-d0vg'; 
// =================================================================

// --- Initialize Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define constants
const REPORT_BUCKET = 'emergency_photos'; 
const OFFLINE_QUEUE_KEY = '__REPORTS_QUEUE__'; // Key for localStorage queue
const HISTORY_CACHE_KEY = '__REPORT_HISTORY__'; // Key for localStorage history cache
const BROADCAST_CACHE_KEY = '__BROADCAST_HISTORY__'; // Key for broadcast history cache
const INSTALL_PROMPT_KEY = '__PWA_PROMPT_SEEN__'; // Key to track if user has been prompted

// =================================================================
// --- PWA INSTALLATION PROMPT LOGIC ---
// =================================================================
let deferredPrompt = null;

// Add event listener for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt 
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Only show our custom prompt UI on the index page and only if the user hasn't explicitly dismissed it before.
    const onAuthPage = window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/register.html') || window.location.pathname.endsWith('/');
    
    if (onAuthPage && localStorage.getItem(INSTALL_PROMPT_KEY) !== 'true') {
        showPWAInstallPrompt();
    }
});

// Listener for appinstalled event to clean up and hide UI
window.addEventListener('appinstalled', () => {
    hidePWAInstallPrompt();
    deferredPrompt = null;
    localStorage.setItem(INSTALL_PROMPT_KEY, 'true');
});

function addPwaModalStyles() {
    // Dynamically inject necessary styles for the PWA modal if not present
    if (!document.getElementById('pwaModalStyles')) {
        const style = document.createElement('style');
        style.id = 'pwaModalStyles';
        style.textContent = `
            .pwa-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                display: none; /* starts hidden */
                justify-content: center;
                align-items: flex-end; /* Show at the bottom of the screen for mobile feel */
                z-index: 5001;
            }
            .pwa-modal-content {
                background-color: white;
                padding: 30px 20px;
                border-radius: 12px 12px 0 0; /* Rounded top corners */
                box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.3);
                text-align: center;
                max-width: 100%;
                width: 100%;
                box-sizing: border-box;
                animation: slideUp 0.3s ease-out forwards;
            }
            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            .pwa-modal-content h3 {
                color: var(--primary-color, #d32f2f);
                margin-top: 0;
                font-size: 1.4em;
            }
            .pwa-modal-content p {
                color: #555;
            }
            .pwa-modal-actions {
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .secondary-button-pwa {
                padding: 12px 15px;
                border-radius: 8px;
                font-weight: 600;
                text-decoration: none;
                text-align: center;
                cursor: pointer;
                transition: background-color 0.2s, box-shadow 0.2s;
                background-color: #f0f2f5; 
                color: #333; 
                border: 1px solid #e0e0e0;
                width: 100%;
                box-sizing: border-box;
                font-size: 1em; /* Match main-button font size */
            }
            .secondary-button-pwa:hover {
                background-color: #e0e0e0;
            }
        `;
        document.head.appendChild(style);
    }
}

function showPWAInstallPrompt() {
    if (deferredPrompt) {
        addPwaModalStyles();

        if (!document.getElementById('pwaInstallModal')) {
            const modalHtml = `
                <div id="pwaInstallModal" class="pwa-modal-overlay">
                    <div class="pwa-modal-content">
                        <h3>Install ResQ App</h3>
                        <p>Get the full, fastest experience with reliable offline features.</p>
                        <div class="pwa-modal-actions">
                            <button id="installPwaBtn" class="main-button">
                                <i class="fas fa-download"></i> Install App Now
                            </button>
                            <button id="dismissPwaBtn" class="secondary-button-pwa">
                                Continue to Website
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            document.getElementById('installPwaBtn').addEventListener('click', handleInstallClick);
            document.getElementById('dismissPwaBtn').addEventListener('click', handleDismissClick);
        }
        document.getElementById('pwaInstallModal').style.display = 'flex';
    }
}

function hidePWAInstallPrompt() {
    const modal = document.getElementById('pwaInstallModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleInstallClick() {
    hidePWAInstallPrompt();
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showMessage('ResQ PWA installation accepted!', 'success', 5000);
            } else {
                showMessage('Installation dismissed. You can install it later from the browser menu.', 'info', 7000);
            }
            deferredPrompt = null;
            // Mark as seen regardless of choice, to prevent immediate re-prompt
            localStorage.setItem(INSTALL_PROMPT_KEY, 'true');
        });
    }
}

function handleDismissClick() {
    hidePWAInstallPrompt();
    // Mark as dismissed, don't re-prompt them immediately. They can still install manually.
    localStorage.setItem(INSTALL_PROMPT_KEY, 'true'); 
    showMessage('Continuing to web app. You can install the app later.', 'info', 5000);
}


// =================================================================
// --- Global Utilities ---
// =================================================================

function showMessage(message, type = 'success', duration = 3000) {
    const messageBox = document.getElementById('customMessageBox');
    if (!messageBox) return;

    messageBox.className = `custom-message-box hidden ${type}`;
    messageBox.textContent = message;

    setTimeout(() => {
        messageBox.classList.remove('hidden');
        messageBox.classList.add('show');
    }, 10); 

    setTimeout(() => {
        messageBox.classList.remove('show');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 300); 
    }, duration);
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(error => {
            console.warn('Audio playback prevented by browser:', error);
        });
    }
}

async function fetchProfileWithTimeout(userId) {
    const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    // 5 second timeout
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Profile load timed out (5s). Check network or RLS policy.")), 5000)
    );

    return Promise.race([fetchPromise, timeoutPromise]);
}

async function fetchAndStoreProfile(userId) {
     try {
        const { data, error } = await fetchProfileWithTimeout(userId);
            
        if (error) {
            throw new Error(error.message);
        }

        if (data) {
            // Note: Keep this logic clean to ensure all necessary fields are stored
            localStorage.setItem('profileData', JSON.stringify(data));
            return true;
        } else {
            throw new Error('Profile data record is missing from the database.');
        }
    } catch (e) {
        console.error('Error fetching profile for local storage:', e);
        return !!localStorage.getItem('profileData');
    }
}

function setDrawerHeader() {
    const drawerTitle = document.getElementById('drawerTitle');
    if (!drawerTitle) return;

    const profileDataString = localStorage.getItem('profileData');
    if (profileDataString) {
        try {
            const profile = JSON.parse(profileDataString);
            if (profile.fullname && profile.fullname.trim() !== '') {
                const firstName = profile.fullname.split(' ')[0];
                drawerTitle.textContent = `Hello, ${firstName}`;
                return;
            }
        } catch (e) {
            console.error('Error parsing profile data:', e);
        }
    }
    drawerTitle.textContent = 'ResQ Menu';
}


function setupDrawerMenu() {
    const menuButton = document.getElementById('menuButton');
    const sideDrawer = document.getElementById('sideDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const logoutButton = document.getElementById('logoutButton');

    // Drawer links need to be updated to reflect the new broadcasts page
    const navBroadcasts = document.querySelector('nav a[href="broadcasts.html"]');
    
    // Set up the active state if on the broadcasts page
    if (navBroadcasts && window.location.pathname.endsWith('/broadcasts.html')) {
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        navBroadcasts.classList.add('active');
    }
    
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sideDrawer.classList.add('open');
            drawerBackdrop.classList.add('show'); 
            setDrawerHeader(); 
        });
    }

    if (closeDrawer) {
        closeDrawer.addEventListener('click', () => {
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('show'); 
        });
    }

    if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', () => {
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('show'); 
        });
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            localStorage.clear();
            localStorage.removeItem(HISTORY_CACHE_KEY); 
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            localStorage.removeItem(BROADCAST_CACHE_KEY); // Clear Broadcast cache
            localStorage.removeItem(INSTALL_PROMPT_KEY); // Clear PWA prompt key on logout

            if (error) {
                showMessage('Logout failed: ' + error.message, 'error');
            } else {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                }
                showMessage('Logged out successfully.', 'success');
                window.location.href = 'index.html';
            }
        });
    }
}

// --- Global Utility: Check Authentication (FIXED FOR PERSISTENCE) ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    let profileLoaded = false;
    
    const onAuthPage = window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/register.html') || window.location.pathname.endsWith('/');

    if (session) {
        if (onAuthPage) {
            window.location.href = 'home.html'; 
            return false; 
        }
        
        const userId = session.user.id;
        localStorage.setItem('userId', userId);
        
        const profileData = localStorage.getItem('profileData');
        let profile = profileData ? JSON.parse(profileData) : {};

        if (!profileData || !profile.fullname || profile.fullname.trim() === '') {
            if (navigator.onLine) {
                 profileLoaded = await fetchAndStoreProfile(userId);
            } else {
                 profileLoaded = false; 
                 showMessage('Offline and profile data is missing. Please connect to the internet to verify credentials.', 'error', 10000);
            }
        } else {
            profileLoaded = true;
        }
        
        if (!profileLoaded && !onAuthPage) {
             showMessage('Critical Error: Failed to load user profile. Please log in again.', 'error', 10000);
             await supabase.auth.signOut();
             localStorage.clear();
             setTimeout(() => window.location.href = 'index.html', 500); 
             return false;
        }

    } else {
        if (!onAuthPage) {
            window.location.href = 'index.html'; 
            return false; 
        }
    }
    return profileLoaded;
}

function getLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const locationText = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
                callback({ success: true, lat, lon, locationText });
            },
            (error) => {
                let errorMessage = "Location not available. Ensure services are enabled.";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = "PERMISSION DENIED: Allow location access.";
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = "TIMEOUT: Signal weak. Try moving & click 'Get Location'.";
                }
                callback({ success: false, errorMessage });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
        );
    } else {
        callback({ success: false, errorMessage: "Geolocation not supported by this browser." });
    }
}

async function uploadImage(file, userId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    showMessage('Uploading photo...', 'info', 2000);

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET) 
        .upload(filePath, file);
        
    if (uploadError) {
        console.error('Photo Upload Error:', uploadError.message);
        showMessage('Photo upload failed. Check Storage RLS and Bucket name.', 'error', 5000);
        return null;
    }
    
    return filePath;
}

function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

// =================================================================
// OFFLINE REPORT QUEUEING LOGIC
// =================================================================

function getQueuedReports() {
    try {
        const queueString = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return queueString ? JSON.parse(queueString) : [];
    } catch (e) {
        console.error('Error reading report queue:', e);
        return [];
    }
}

function saveQueuedReports(queue) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function queueReport(reportPayload) {
    const queue = getQueuedReports();
    reportPayload.offline_timestamp = Date.now(); // Add timestamp for ordering
    queue.push(reportPayload);
    saveQueuedReports(queue);
    showMessage('Report saved offline. Will send automatically when connection is restored.', 'info', 7000);
}

async function attemptQueuedReports() {
    const queue = getQueuedReports();
    if (queue.length === 0) return;

    if (!navigator.onLine) {
        console.log('Offline: Cannot send queued reports now.');
        return;
    }
    
    queue.sort((a, b) => a.offline_timestamp - b.offline_timestamp);
    
    let reportsSent = 0;
    const failedQueue = [];

    showMessage(`Connection restored! Attempting to send ${queue.length} queued reports...`, 'success', 5000);

    for (const report of queue) {
        // Construct the payload to match the database schema
        const payloadToSend = {
            user_id: report.user_id,
            incident_type: report.incident_type,
            incident_details: report.incident_details,
            severity_level: report.severity_level,
            latitude: report.latitude,
            longitude: report.longitude,
            photo_url: report.photo_url, // This will be null if offline, as expected
            status: 'Reported',
        };
        
        const { error } = await supabase.from('emergency_reports').insert([payloadToSend]);

        if (error) {
            console.error('Failed to send queued report:', error.message, report);
            failedQueue.push(report); 
        } else {
            reportsSent++;
            localStorage.removeItem(HISTORY_CACHE_KEY); // Invalidate history cache
        }
    }

    if (reportsSent > 0) {
        showMessage(`Successfully sent ${reportsSent} queued report(s).`, 'success', 5000);
    }
    
    saveQueuedReports(failedQueue);
}

// =================================================================
// REAL-TIME & PUSH NOTIFICATIONS
// =================================================================

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showMessage('Notifications enabled!', 'success', 3000);
            } else {
                console.warn('Notification permission denied.');
            }
        });
    }
}

// This function prepares the PWA to receive push notifications
async function setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported.');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        
        if (Notification.permission === 'granted') {
            console.log('Push service is ready. Native push is enabled in Service Worker.');
            // NOTE: Logic for subscribing to a push service would go here.
        }

    } catch (e) {
        console.error('Error setting up Push Notifications:', e);
    }
}

/**
 * FIX: Switched from listening to a custom 'broadcast' event on a custom channel 
 * to listening for the standard 'postgres_changes' INSERT event on the 'broadcasts' table,
 * which is what the admin app triggers.
 */
function setupBroadcastListener() {
    // 1. Create a channel to listen for database changes
    const channel = supabase.channel('broadcasts_channel');

    channel.on(
        'postgres_changes', // Listen for changes in the PostgreSQL database
        { event: 'INSERT', schema: 'public', table: 'broadcasts' }, // Filter for new rows in the broadcasts table
        (payload) => {
            const newBroadcast = payload.new;
            // The message and timestamp are pulled directly from the new row data
            const message = newBroadcast.message || 'Critical message received.';
            const timestamp = newBroadcast.timestamp || new Date().toISOString();
            
            console.log('Database Broadcast Received:', newBroadcast);
            playSound('alarmSound'); 
            
            // 1. In-App Toast
            showMessage(`CRITICAL ALERT: ${message}`, 'warning', 10000);

            // 2. Native Notification (Only if app is open but not focused, or permission is granted)
            if (Notification.permission === 'granted' && document.hidden) { 
                new Notification('RESQ CRITICAL ALERT', {
                    body: message,
                    icon: '/path/to/app-icon-96x96.png', // Use your app icon
                    vibrate: [1000, 500, 1000]
                });
            }
            
            // 3. Store the message locally
            let broadcasts = JSON.parse(localStorage.getItem(BROADCAST_CACHE_KEY) || '[]');
            broadcasts.unshift({ message: message, timestamp: timestamp });
            localStorage.setItem(BROADCAST_CACHE_KEY, JSON.stringify(broadcasts.slice(0, 50))); // Keep last 50

            if (navigator.vibrate) {
                navigator.vibrate([1000, 500, 1000, 500, 1000]);
            }
            
            // Optional: If on broadcasts page, re-render history immediately
            if (window.location.pathname.endsWith('/broadcasts.html')) {
                // Rerender history using the updated cache
                renderBroadcastHistory(broadcasts.slice(0, 50)); 
            }
        }
    ).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('Subscribed to broadcasts table changes.');
        } else {
            console.warn('Subscription status:', status);
        }
    });
}

// --- Supabase SDK Imports ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.3/+esm';

// =================================================================
// YOUR SUPABASE CONFIGURATION 
// =================================================================
const SUPABASE_URL = 'https://ayptiehjxxincwsbtysl.supabase.co'; 
// !!! THE CORRECT ANON KEY HAS BEEN RESTORED HERE !!!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cHRpZWhqeHhpbmN3c2J0eXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTY2NzIsImV4cCI6MjA3NjE3MjY3Mn0.jafnb-fxqWbZm7uJf2g11CgiGzS-MetDY1h0kV-d0vg'; 
// =================================================================

// --- Initialize Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define constants
const REPORT_BUCKET = 'emergency_photos'; 
const OFFLINE_QUEUE_KEY = '__REPORTS_QUEUE__'; // Key for localStorage queue
const HISTORY_CACHE_KEY = '__REPORT_HISTORY__'; // Key for localStorage history cache
const BROADCAST_CACHE_KEY = '__BROADCAST_HISTORY__'; // Key for broadcast history cache
const INSTALL_PROMPT_KEY = '__PWA_PROMPT_SEEN__'; // Key to track if user has been prompted

// =================================================================
// --- PWA INSTALLATION PROMPT LOGIC ---
// =================================================================
let deferredPrompt = null;

// Add event listener for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt 
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Only show our custom prompt UI on the index page and only if the user hasn't explicitly dismissed it before.
    const onAuthPage = window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/register.html') || window.location.pathname.endsWith('/');
    
    if (onAuthPage && localStorage.getItem(INSTALL_PROMPT_KEY) !== 'true') {
        showPWAInstallPrompt();
    }
});

// Listener for appinstalled event to clean up and hide UI
window.addEventListener('appinstalled', () => {
    hidePWAInstallPrompt();
    deferredPrompt = null;
    localStorage.setItem(INSTALL_PROMPT_KEY, 'true');
});

function addPwaModalStyles() {
    // Dynamically inject necessary styles for the PWA modal if not present
    if (!document.getElementById('pwaModalStyles')) {
        const style = document.createElement('style');
        style.id = 'pwaModalStyles';
        style.textContent = `
            .pwa-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                display: none; /* starts hidden */
                justify-content: center;
                align-items: flex-end; /* Show at the bottom of the screen for mobile feel */
                z-index: 5001;
            }
            .pwa-modal-content {
                background-color: white;
                padding: 30px 20px;
                border-radius: 12px 12px 0 0; /* Rounded top corners */
                box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.3);
                text-align: center;
                max-width: 100%;
                width: 100%;
                box-sizing: border-box;
                animation: slideUp 0.3s ease-out forwards;
            }
            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            .pwa-modal-content h3 {
                color: var(--primary-color, #d32f2f);
                margin-top: 0;
                font-size: 1.4em;
            }
            .pwa-modal-content p {
                color: #555;
            }
            .pwa-modal-actions {
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .secondary-button-pwa {
                padding: 12px 15px;
                border-radius: 8px;
                font-weight: 600;
                text-decoration: none;
                text-align: center;
                cursor: pointer;
                transition: background-color 0.2s, box-shadow 0.2s;
                background-color: #f0f2f5; 
                color: #333; 
                border: 1px solid #e0e0e0;
                width: 100%;
                box-sizing: border-box;
                font-size: 1em; /* Match main-button font size */
            }
            .secondary-button-pwa:hover {
                background-color: #e0e0e0;
            }
        `;
        document.head.appendChild(style);
    }
}

function showPWAInstallPrompt() {
    if (deferredPrompt) {
        addPwaModalStyles();

        if (!document.getElementById('pwaInstallModal')) {
            const modalHtml = `
                <div id="pwaInstallModal" class="pwa-modal-overlay">
                    <div class="pwa-modal-content">
                        <h3>Install ResQ App</h3>
                        <p>Get the full, fastest experience with reliable offline features.</p>
                        <div class="pwa-modal-actions">
                            <button id="installPwaBtn" class="main-button">
                                <i class="fas fa-download"></i> Install App Now
                            </button>
                            <button id="dismissPwaBtn" class="secondary-button-pwa">
                                Continue to Website
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            document.getElementById('installPwaBtn').addEventListener('click', handleInstallClick);
            document.getElementById('dismissPwaBtn').addEventListener('click', handleDismissClick);
        }
        document.getElementById('pwaInstallModal').style.display = 'flex';
    }
}

function hidePWAInstallPrompt() {
    const modal = document.getElementById('pwaInstallModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleInstallClick() {
    hidePWAInstallPrompt();
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showMessage('ResQ PWA installation accepted!', 'success', 5000);
            } else {
                showMessage('Installation dismissed. You can install it later from the browser menu.', 'info', 7000);
            }
            deferredPrompt = null;
            // Mark as seen regardless of choice, to prevent immediate re-prompt
            localStorage.setItem(INSTALL_PROMPT_KEY, 'true');
        });
    }
}

function handleDismissClick() {
    hidePWAInstallPrompt();
    // Mark as dismissed, don't re-prompt them immediately. They can still install manually.
    localStorage.setItem(INSTALL_PROMPT_KEY, 'true'); 
    showMessage('Continuing to web app. You can install the app later.', 'info', 5000);
}


// =================================================================
// --- Global Utilities ---
// =================================================================

function showMessage(message, type = 'success', duration = 3000) {
    const messageBox = document.getElementById('customMessageBox');
    if (!messageBox) return;

    messageBox.className = `custom-message-box hidden ${type}`;
    messageBox.textContent = message;

    setTimeout(() => {
        messageBox.classList.remove('hidden');
        messageBox.classList.add('show');
    }, 10); 

    setTimeout(() => {
        messageBox.classList.remove('show');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 300); 
    }, duration);
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(error => {
            console.warn('Audio playback prevented by browser:', error);
        });
    }
}

async function fetchProfileWithTimeout(userId) {
    const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    // 5 second timeout
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Profile load timed out (5s). Check network or RLS policy.")), 5000)
    );

    return Promise.race([fetchPromise, timeoutPromise]);
}

async function fetchAndStoreProfile(userId) {
      try {
        const { data, error } = await fetchProfileWithTimeout(userId);
            
        if (error) {
            throw new Error(error.message);
        }

        if (data) {
            // Note: Keep this logic clean to ensure all necessary fields are stored
            localStorage.setItem('profileData', JSON.stringify(data));
            return true;
        } else {
            throw new Error('Profile data record is missing from the database.');
        }
    } catch (e) {
        console.error('Error fetching profile for local storage:', e);
        return !!localStorage.getItem('profileData');
    }
}

function setDrawerHeader() {
    const drawerTitle = document.getElementById('drawerTitle');
    if (!drawerTitle) return;

    const profileDataString = localStorage.getItem('profileData');
    if (profileDataString) {
        try {
            const profile = JSON.parse(profileDataString);
            if (profile.fullname && profile.fullname.trim() !== '') {
                const firstName = profile.fullname.split(' ')[0];
                drawerTitle.textContent = `Hello, ${firstName}`;
                return;
            }
        } catch (e) {
            console.error('Error parsing profile data:', e);
        }
    }
    drawerTitle.textContent = 'ResQ Menu';
}


function setupDrawerMenu() {
    const menuButton = document.getElementById('menuButton');
    const sideDrawer = document.getElementById('sideDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const logoutButton = document.getElementById('logoutButton');

    // Drawer links need to be updated to reflect the new broadcasts page
    const navBroadcasts = document.querySelector('nav a[href="broadcasts.html"]');
    
    // Set up the active state if on the broadcasts page
    if (navBroadcasts && window.location.pathname.endsWith('/broadcasts.html')) {
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        navBroadcasts.classList.add('active');
    }
    
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sideDrawer.classList.add('open');
            drawerBackdrop.classList.add('show'); 
            setDrawerHeader(); 
        });
    }

    if (closeDrawer) {
        closeDrawer.addEventListener('click', () => {
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('show'); 
        });
    }

    if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', () => {
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('show'); 
        });
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            localStorage.clear();
            localStorage.removeItem(HISTORY_CACHE_KEY); 
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            localStorage.removeItem(BROADCAST_CACHE_KEY); // Clear Broadcast cache
            localStorage.removeItem(INSTALL_PROMPT_KEY); // Clear PWA prompt key on logout

            if (error) {
                showMessage('Logout failed: ' + error.message, 'error');
            } else {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                }
                showMessage('Logged out successfully.', 'success');
                window.location.href = 'index.html';
            }
        });
    }
}

// --- Global Utility: Check Authentication (FIXED FOR PERSISTENCE) ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    let profileLoaded = false;
    
    const onAuthPage = window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/register.html') || window.location.pathname.endsWith('/');

    if (session) {
        if (onAuthPage) {
            window.location.href = 'home.html'; 
            return false; 
        }
        
        const userId = session.user.id;
        localStorage.setItem('userId', userId);
        
        const profileData = localStorage.getItem('profileData');
        let profile = profileData ? JSON.parse(profileData) : {};

        if (!profileData || !profile.fullname || profile.fullname.trim() === '') {
            if (navigator.onLine) {
                profileLoaded = await fetchAndStoreProfile(userId);
            } else {
                profileLoaded = false; 
                showMessage('Offline and profile data is missing. Please connect to the internet to verify credentials.', 'error', 10000);
            }
        } else {
            profileLoaded = true;
        }
        
        if (!profileLoaded && !onAuthPage) {
              showMessage('Critical Error: Failed to load user profile. Please log in again.', 'error', 10000);
              await supabase.auth.signOut();
              localStorage.clear();
              setTimeout(() => window.location.href = 'index.html', 500); 
              return false;
        }

    } else {
        if (!onAuthPage) {
            window.location.href = 'index.html'; 
            return false; 
        }
    }
    return profileLoaded;
}

function getLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const locationText = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
                callback({ success: true, lat, lon, locationText });
            },
            (error) => {
                let errorMessage = "Location not available. Ensure services are enabled.";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = "PERMISSION DENIED: Allow location access.";
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = "TIMEOUT: Signal weak. Try moving & click 'Get Location'.";
                }
                callback({ success: false, errorMessage });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
        );
    } else {
        callback({ success: false, errorMessage: "Geolocation not supported by this browser." });
    }
}

async function uploadImage(file, userId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    showMessage('Uploading photo...', 'info', 2000);

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET) 
        .upload(filePath, file);
        
    if (uploadError) {
        console.error('Photo Upload Error:', uploadError.message);
        showMessage('Photo upload failed. Check Storage RLS and Bucket name.', 'error', 5000);
        return null;
    }
    
    return filePath;
}

function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

// =================================================================
// OFFLINE REPORT QUEUEING LOGIC
// =================================================================

function getQueuedReports() {
    try {
        const queueString = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return queueString ? JSON.parse(queueString) : [];
    } catch (e) {
        console.error('Error reading report queue:', e);
        return [];
    }
}

function saveQueuedReports(queue) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function queueReport(reportPayload) {
    const queue = getQueuedReports();
    reportPayload.offline_timestamp = Date.now(); // Add timestamp for ordering
    queue.push(reportPayload);
    saveQueuedReports(queue);
    showMessage('Report saved offline. Will send automatically when connection is restored.', 'info', 7000);
}

async function attemptQueuedReports() {
    const queue = getQueuedReports();
    if (queue.length === 0) return;

    if (!navigator.onLine) {
        console.log('Offline: Cannot send queued reports now.');
        return;
    }
    
    queue.sort((a, b) => a.offline_timestamp - b.offline_timestamp);
    
    let reportsSent = 0;
    const failedQueue = [];

    showMessage(`Connection restored! Attempting to send ${queue.length} queued reports...`, 'success', 5000);

    for (const report of queue) {
        // Construct the payload to match the database schema
        const payloadToSend = {
            user_id: report.user_id,
            incident_type: report.incident_type,
            incident_details: report.incident_details,
            severity_level: report.severity_level,
            latitude: report.latitude,
            longitude: report.longitude,
            photo_url: report.photo_url, // This will be null if offline, as expected
            status: 'Reported',
        };
        
        const { error } = await supabase.from('emergency_reports').insert([payloadToSend]);

        if (error) {
            console.error('Failed to send queued report:', error.message, report);
            failedQueue.push(report); 
        } else {
            reportsSent++;
            localStorage.removeItem(HISTORY_CACHE_KEY); // Invalidate history cache
        }
    }

    if (reportsSent > 0) {
        showMessage(`Successfully sent ${reportsSent} queued report(s).`, 'success', 5000);
    }
    
    saveQueuedReports(failedQueue);
}

// =================================================================
// REAL-TIME & PUSH NOTIFICATIONS
// =================================================================

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showMessage('Notifications enabled!', 'success', 3000);
            } else {
                console.warn('Notification permission denied.');
            }
        });
    }
}

// This function prepares the PWA to receive push notifications
async function setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported.');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        
        if (Notification.permission === 'granted') {
            console.log('Push service is ready. Native push is enabled in Service Worker.');
            // NOTE: Logic for subscribing to a push service would go here.
        }

    } catch (e) {
        console.error('Error setting up Push Notifications:', e);
    }
}

/**
 * FIX IMPLEMENTED HERE: Switched from listening to a custom event to 
 * listening for the standard 'postgres_changes' INSERT event on the 'broadcasts' table.
 */
function setupBroadcastListener() {
    // 1. Create a channel to listen for database changes
    const channel = supabase.channel('broadcasts_channel');

    channel.on(
        'postgres_changes', // Listen for changes in the PostgreSQL database
        { event: 'INSERT', schema: 'public', table: 'broadcasts' }, // Filter for new rows in the broadcasts table
        (payload) => {
            const newBroadcast = payload.new;
            // The message and timestamp are pulled directly from the new row data
            const message = newBroadcast.message || 'Critical message received.';
            const timestamp = newBroadcast.timestamp || new Date().toISOString();
            
            console.log('Database Broadcast Received:', newBroadcast);
            playSound('alarmSound'); 
            
            // 1. In-App Toast
            showMessage(`CRITICAL ALERT: ${message}`, 'warning', 10000);

            // 2. Native Notification (Only if app is open but not focused, or permission is granted)
            if (Notification.permission === 'granted' && document.hidden) { 
                new Notification('RESQ CRITICAL ALERT', {
                    body: message,
                    icon: '/path/to/app-icon-96x96.png', // Use your app icon
                    vibrate: [1000, 500, 1000]
                });
            }
            
            // 3. Store the message locally
            let broadcasts = JSON.parse(localStorage.getItem(BROADCAST_CACHE_KEY) || '[]');
            broadcasts.unshift({ message: message, timestamp: timestamp });
            localStorage.setItem(BROADCAST_CACHE_KEY, JSON.stringify(broadcasts.slice(0, 50))); // Keep last 50

            if (navigator.vibrate) {
                navigator.vibrate([1000, 500, 1000, 500, 1000]);
            }
            
            // Optional: If on broadcasts page, re-render history immediately
            if (window.location.pathname.endsWith('/broadcasts.html')) {
                // Rerender history using the updated cache
                renderBroadcastHistory(broadcasts.slice(0, 50)); 
            }
        }
    ).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('Subscribed to broadcasts table changes.');
        } else {
            console.warn('Subscription status:', status);
        }
    });
}

// =================================================================
// BROADCAST HISTORY LOGIC
// =================================================================

function renderBroadcastHistory(broadcasts) {
    const historyContainer = document.getElementById('broadcastsHistoryContainer');
    if (!historyContainer) return;

    if (broadcasts.length === 0) {
        historyContainer.innerHTML = '<p class="empty-state">No emergency broadcasts have been received yet.</p>';
        return;
    }

    // Ensure broadcasts are sorted by timestamp, newest first (cache should already be, but safe to sort here)
    broadcasts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    historyContainer.innerHTML = broadcasts.map(broadcast => `
        <div class="broadcast-card-history">
            <span class="broadcast-date">${formatDateTime(broadcast.timestamp)}</span>
            <p class="broadcast-message">${broadcast.message}</p>
        </div>
    `).join('');
}

async function fetchBroadcastHistory() {
    const historyContainer = document.getElementById('broadcastsHistoryContainer');
    if (!historyContainer) return;
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        historyContainer.innerHTML = '<p class="empty-state" style="color:#f44336;">Please log in to load broadcast history.</p>';
        return;
    }
    
    // 1. Load from cache first
    const cachedBroadcasts = localStorage.getItem(BROADCAST_CACHE_KEY);
    if (cachedBroadcasts) {
        try {
            const data = JSON.parse(cachedBroadcasts);
            renderBroadcastHistory(data);
            showMessage('Displaying cached broadcasts. Fetching latest...', 'info', 3000);
        } catch (e) {
            console.error('Error parsing broadcast cache:', e);
        }
    } else {
        historyContainer.innerHTML = '<p class="empty-state">Loading broadcast history...</p>';
    }

    if (!navigator.onLine) {
        if (!cachedBroadcasts) {
             historyContainer.innerHTML = '<p class="empty-state">You are offline. Cannot load broadcast history.</p>';
        }
        return;
    }

    // 2. Fetch from network
    const { data: broadcasts, error } = await supabase
        .from('broadcasts')
        .select('message, timestamp')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching broadcasts:', error.message);
        // This is the check for the RLS issue. If this fires, the SQL was not run.
        showMessage('Failed to load broadcasts from server. (Error: ' + error.message + '). Please ensure RLS policy is set for "authenticated" users to SELECT.', 'error', 10000);
        return;
    }

    // 3. Cache and render fresh data
    localStorage.setItem(BROADCAST_CACHE_KEY, JSON.stringify(broadcasts));
    renderBroadcastHistory(broadcasts);
}

// =================================================================
// --- Page Specific Logic Initialization ---
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // +++ Service Worker Registration +++
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js') 
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    setupPushNotifications(); // Attempt to setup push after SW is registered
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
    
    // Request permission immediately on load (will prompt the user)
    requestNotificationPermission();

    // Await checkAuth to handle redirects and ensure profile is loaded
    const profileLoaded = await checkAuth(); 
    // Stop execution on pages that are about to redirect
    if (!profileLoaded && !window.location.pathname.endsWith('/index.html') && !window.location.pathname.endsWith('/register.html')) {
        return; 
    }

    setupDrawerMenu();
    setDrawerHeader(); 

    // Attempt to send any reports queued while offline
    attemptQueuedReports();
    
    // =================================================================
    // LOGIN PAGE (index.html) Logic
    // =================================================================
    if (window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/')) {
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                showMessage('Logging in...', 'success', 2000);
                
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });

                if (error) {
                    showMessage('Login Failed: ' + error.message, 'error', 5000);
                } else if (data.session) {
                    const userId = data.user.id;
                    const profileExists = await fetchAndStoreProfile(userId);
                    
                    if (!profileExists) {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        showMessage('Login failed. Could not load profile data.', 'error', 7000);
                        return;
                    }
                    
                    localStorage.setItem('userId', userId);
                    setDrawerHeader(); 
                    showMessage('Login Successful! Redirecting...', 'success', 1000);
                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 1000);
                }
            });
        }
    }

    // =================================================================
    // REGISTRATION PAGE (register.html) Logic
    // =================================================================
    if (window.location.pathname.endsWith('/register.html')) {
        const registerForm = document.getElementById('registerForm');
        
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const fullname = document.getElementById('fullname').value;
                const phone = document.getElementById('phone').value;
                const dob = document.getElementById('dob').value;
                const gender = document.getElementById('gender')?.value || null; 
                const bloodgrp = document.getElementById('bloodgrp')?.value || null; 
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const pincode = document.getElementById('pincode').value;
                const emergency1 = document.getElementById('emergency1').value;
                const emergency2 = document.getElementById('emergency2').value || null;
                const medical = document.getElementById('medical').value || null;
                
                showMessage('Registering...', 'info', 2000);
                
                // Step 1: Auth sign up
                const { data: authData, error: authError } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: { fullname: fullname } 
                    }
                });
                
                if (authError) {
                    showMessage('Registration Failed: ' + authError.message, 'error', 5000);
                    return;
                }
                
                const userId = authData.user.id;
                
                // Step 2: Profile insert 
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: userId,
                            fullname: fullname,       
                            email: email,                   
                            phone: phone, 
                            dob: dob, 
                            gender: gender,                 
                            bloodgrp: bloodgrp,             
                            address: address, 
                            city: city, 
                            pincode: pincode, 
                            emergency1: emergency1,   
                            emergency2: emergency2,        
                            medical: medical      
                        }
                    ]);
                    
                if (profileError) {
                    console.error('Profile Insert Error:', profileError);
                    showMessage('Registration completed, but failed to save profile details. Log in to update profile.', 'error', 8000);
                }
                
                localStorage.setItem('userId', userId);
                await fetchAndStoreProfile(userId); 
                setDrawerHeader(); 
                showMessage('Registration successful! Redirecting to Home...', 'success', 1000);
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            });
        }
    }
    
    // =================================================================
    // HOME PAGE (home.html) Logic
    // =================================================================
    if (window.location.pathname.endsWith('/home.html')) {
        setupBroadcastListener(); // Start listening for real-time alerts
    }


    // =================================================================
    // PROFILE PAGE (profile.html) Logic
    // =================================================================

    if (window.location.pathname.endsWith('/profile.html')) {
        
        const detailsContainer = document.getElementById('profileDetailsContainer');
        
        function updateProfileDisplay(htmlContent) {
            if (detailsContainer) {
                detailsContainer.innerHTML = htmlContent;
            }
        }
        
        function displayProfile(profile) {
            if (!profile) {
                return '<p class="text-center">User profile data could not be loaded.</p>';
            }
            
            const createItem = (label, value) => `
                <div class="profile-item">
                    <span class="profile-label">${label}:</span>
                    <span class="profile-value">${value || 'N/A'}</span>
                </div>
            `;
            
            const html = `
                <div class="profile-info">
                    <h2>Personal Information</h2>
                    ${createItem('Full Name', profile.fullname)}
                    ${createItem('Email', profile.email)}
                    ${createItem('Phone', profile.phone)}
                    ${createItem('Date of Birth', profile.dob)}
                    ${createItem('Gender', profile.gender)}
                    ${createItem('Blood Group', profile.bloodgrp)}
                    
                    <h2 style="margin-top: 25px;">Address</h2>
                    <div class="profile-group">
                        <p>${profile.address || 'N/A'}</p>
                        <p>${profile.city || 'N/A'}${profile.pincode ? ` - ${profile.pincode}` : ''}</p>
                    </div>
                    
                    <h2 style="margin-top: 25px;">Emergency Contacts</h2>
                    ${createItem('Contact 1', profile.emergency1)}
                    ${createItem('Contact 2', profile.emergency2)}
                    
                    <h2 style="margin-top: 25px;">Medical Information</h2>
                    <div class="profile-group">
                        <p><strong>Conditions:</strong> ${profile.medical || 'None specified.'}</p>
                    </div>

                    <button type="button" id="editProfileBtn" class="main-button" style="margin-top: 30px;">Edit Profile</button>
                </div>
            `;
            
            updateProfileDisplay(html);
            
            const editBtn = document.getElementById('editProfileBtn');
            if(editBtn) {
                editBtn.addEventListener('click', () => {
                    showMessage('Edit functionality not yet implemented.', 'info', 3000);
                });
            }
        }

        async function loadProfile() {
            const userId = localStorage.getItem('userId');
            
            if (!userId) {
                updateProfileDisplay('<p class="text-center" style="color:#f44336;">Error: User not logged in.</p>');
                return;
            }
            
            updateProfileDisplay(`
                <div class="text-center" style="margin-top: 50px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #d32f2f;"></i>
                    <p>Loading user data...</p>
                </div>
            `);
            
            try {
                const { data, error } = await fetchProfileWithTimeout(userId);
                
                if (error) { 
                    throw new Error(error.message); 
                }

                if (data) {
                    localStorage.setItem('profileData', JSON.stringify(data));
                    displayProfile(data); 
                } else {
                    throw new Error("Profile record not found for this user ID.");
                }

            } catch (e) {
                console.error("Profile loading error:", e.message);

                const localData = localStorage.getItem('profileData');
                if (localData) {
                    showMessage(`Could not connect to update profile. Using offline data. (${e.message})`, 'info', 7000);
                    displayProfile(JSON.parse(localData));
                    return;
                }
                
                updateProfileDisplay(`<p class="text-center" style="color:#f44336;">Failed to load profile: ${e.message}. Please check your network connection or contact support.</p>`);
                showMessage('Failed to load profile: ' + e.message, 'error', 8000);
            }
        }
        
        loadProfile();
    }

    // =================================================================
    // REPORT EMERGENCY PAGE (report.html) Logic
    // =================================================================
    if (window.location.pathname.endsWith('/report.html')) {
        const reportForm = document.getElementById('emergencyReportForm'); 
        const countdownModal = document.getElementById('countdownModal');
        const successModal = document.getElementById('successModal');
        const countdownTimer = document.getElementById('countdownTimer');
        const getLocationBtn = document.getElementById('getLocationBtn');
        const locationTextEl = document.getElementById('location'); 
        const latitudeInput = document.getElementById('latitude'); 
        const longitudeInput = document.getElementById('longitude'); 
        const submitButton = document.getElementById('submitReportBtn');
        const photoInput = document.getElementById('photo'); 

        let isFetchingLocation = false;
        let currentLat = null; 
        let currentLon = null; 
        
        function handleLocationFetch() {
            if (isFetchingLocation) return;
            isFetchingLocation = true;
            
            locationTextEl.value = 'Fetching Location...'; 
            latitudeInput.value = ''; 
            longitudeInput.value = '';
            currentLat = null;
            currentLon = null;

            getLocation((result) => {
                isFetchingLocation = false;
                if (result.success) {
                    locationTextEl.value = result.locationText;
                    latitudeInput.value = result.lat; 
                    longitudeInput.value = result.lon; 
                    currentLat = result.lat;
                    currentLon = result.lon;
                    showMessage('Location acquired successfully.', 'success', 3000);
                } else {
                    locationTextEl.value = result.errorMessage;
                    showMessage(result.errorMessage, 'error', 5000);
                }
            });
        }

        handleLocationFetch();

        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', handleLocationFetch);
        }
        
        if (document.getElementById('closeSuccessBtn')) {
            document.getElementById('closeSuccessBtn').addEventListener('click', () => {
                successModal.classList.add('hidden');
                reportForm.reset();
                currentLat = null;
                currentLon = null;
                locationTextEl.value = 'Not acquired.'; 
                latitudeInput.value = '';
                longitudeInput.value = '';
                submitButton.disabled = false;
                handleLocationFetch(); 
            });
        }

        if (reportForm) {
            reportForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                event.stopImmediatePropagation(); 

                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;
                
                if (!userId) {
                    showMessage('Error: You are not logged in.', 'error', 5000);
                    return; 
                }
                
                const incidentType = document.getElementById('incidentType').value;
                const rawDescription = document.getElementById('description').value.trim();
                const descriptionValue = rawDescription || 'No details provided by user.'; 
                const severity = document.getElementById('severity').value; 
                const photoFile = photoInput.files[0]; 

                submitButton.disabled = true;

                if (!incidentType || incidentType === '') {
                    showMessage('Please select an incident type.', 'error', 4000);
                    submitButton.disabled = false;
                    return;
                }
                
                if (currentLat === null || currentLon === null || locationTextEl.value.includes('Location not available') || locationTextEl.value.includes('PERMISSION DENIED') || locationTextEl.value.includes('TIMEOUT') || locationTextEl.value.includes('Fetching Location')) {
                    showMessage('Valid location is required. Please wait for location or click "Get Location".', 'error', 7000);
                    submitButton.disabled = false;
                    return;
                }

                countdownModal.classList.remove('hidden');
                
                const countdownAudio = document.getElementById('countdownSound');
                if (countdownAudio) { 
                    countdownAudio.play().catch(error => console.warn('Audio playback error (countdown):', error));
                }

                document.getElementById('countdownMessage').textContent = 'Report sending in...';

                let count = 3;
                countdownTimer.textContent = count; 

                const countdownInterval = setInterval(async () => {
                    count--; 
                    
                    if (count >= 0) {
                        countdownTimer.textContent = count; 
                    }
                    
                    if (count <= 0) {
                        clearInterval(countdownInterval);
                        
                        if (countdownAudio) {
                            countdownAudio.pause();
                            countdownAudio.currentTime = 0; 
                        }
                        
                        document.getElementById('countdownMessage').textContent = 'Sending...';

                        let photoPath = null; 

                        // 1. Handle Photo Upload - REQUIRES INTERNET
                        if (photoFile) {
                            if (navigator.onLine) {
                                photoPath = await uploadImage(photoFile, userId); 
                                
                                if (!photoPath) {
                                    countdownModal.classList.add('hidden');
                                    submitButton.disabled = false;
                                    return; 
                                }
                            } else {
                                showMessage("You are offline. Cannot upload photo; submitting report without image.", 'warning', 7000);
                                photoPath = null; 
                            }
                        }

                        // 2. Prepare payload 
                        const reportPayload = { 
                            user_id: userId, 
                            incident_type: incidentType, 
                            incident_details: descriptionValue, 
                            severity_level: severity, 
                            latitude: currentLat, 
                            longitude: currentLon, 
                            photo_url: photoPath, 
                            status: 'Reported', 
                        };

                        // 3. Attempt Submission 
                        if (navigator.onLine) {
                            try {
                                const { error: submissionError } = await supabase.from('emergency_reports').insert([reportPayload]);
                                
                                if (submissionError) {
                                    console.error('Submission Error:', submissionError.message);
                                    showMessage(`Report submission failed! (Error: ${submissionError.message})`, 'error', 7000);
                                } else {
                                    countdownModal.classList.add('hidden');
                                    successModal.classList.remove('hidden');
                                    playSound('successSound'); 
                                    showMessage('Report submitted successfully!', 'success', 5000);
                                    localStorage.removeItem(HISTORY_CACHE_KEY); 
                                }
                            } catch (e) {
                                console.error('Fatal submission error:', e);
                                showMessage(`An unexpected error occurred: ${e.message}`, 'error', 5000);
                            }
                        } else {
                            // OFFLINE QUEUE
                            queueReport(reportPayload);
                            
                            countdownModal.classList.add('hidden');
                            successModal.classList.remove('hidden');
                            playSound('successSound'); 
                        }
                        
                        countdownModal.classList.add('hidden'); 
                        submitButton.disabled = false; 
                    }
                }, 1000);
            });
        }
    }
    
    // =================================================================
    // HISTORY PAGE (history.html) Logic
    // =================================================================
    if (window.location.pathname.endsWith('/history.html')) {
        
        async function loadReportsHistory() {
            const userId = localStorage.getItem('userId');
            const reportsList = document.getElementById('reportsHistoryContainer');
            
            if (!userId) {
                reportsList.innerHTML = '<p class="text-center" style="color:#f44336;">Please log in to view history.</p>';
                return;
            }
            
            reportsList.innerHTML = '<div class="text-center" style="margin-top: 50px;"><i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #d32f2f;"></i><p>Loading reports...</p></div>';

            let data = null;
            let error = null;
            const cachedData = localStorage.getItem(HISTORY_CACHE_KEY);
            
            if (navigator.onLine) {
                try {
                    const response = await supabase
                        .from('emergency_reports') 
                        .select('*') 
                        .eq('user_id', userId)
                        .order('timestamp', { ascending: false });
                        
                    data = response.data;
                    error = response.error;

                    if (data) {
                        localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(data));
                    }
                } catch(e) {
                    console.error("Network history fetch failed:", e);
                    error = { message: "Network request failed. Using cached data if available." };
                }
            }
            
            if (!data && cachedData) {
                data = JSON.parse(cachedData);
                showMessage('You are offline. Showing cached report history.', 'info', 5000);
            } else if (error && !cachedData) {
                 reportsList.innerHTML = `<p class="text-center" style="color:#f44336;">Failed to load history: ${error.message}</p>`;
                 showMessage('Failed to load history: ' + error.message, 'error', 5000);
                 return;
            }
            
            if (data && data.length > 0) {
                reportsList.innerHTML = data.map(report => {
                    const statusClass = report.status === 'Resolved' ? 'status-resolved' : (report.status === 'Assigned' ? 'status-assigned' : 'status-reported');
                    const statusText = report.status || 'Reported'; 
                    const date = new Date(report.timestamp).toLocaleString();
                    
                    // Added dynamic severity class for styling
                    const severityClass = report.severity_level ? `severity-${report.severity_level.toLowerCase()}` : '';
                    const severityHtml = report.severity_level ? `<p class="severity-tag ${severityClass}">Severity: ${report.severity_level}</p>` : '';
                    
                    const locationText = (report.latitude && report.longitude) 
                        ? `Lat: ${report.latitude.toFixed(4)}, Lon: ${report.longitude.toFixed(4)}`
                        : 'Location not recorded';
                        
                    let photoHtml = '';
                    if (report.photo_url) {
                        let publicUrl = null;
                        
                        try {
                            const { data: urlData } = supabase.storage
                                .from(REPORT_BUCKET)
                                .getPublicUrl(report.photo_url); 
                            publicUrl = urlData.publicUrl;
                        } catch(e) { 
                            console.error("Error generating public URL:", e);
                            publicUrl = null;
                        }

                        if (publicUrl) {
                             photoHtml = `<p><a href="${publicUrl}" target="_blank" class="text-link">View Attached Photo</a></p>`;
                        } else {
                            photoHtml = `<p class="text-link" style="color:#f44336; font-style: italic; font-size: 0.9em;">(Photo link unavailable)</p>`;
                        }
                    }

                    return `
                        <div class="report-card-history">
                            <div class="report-header">
                                <h4>${report.incident_type}</h4>
                                <span class="report-status status-tag ${statusClass}">${statusText}</span>
                            </div>
                            ${severityHtml}
                            <p><strong>Location:</strong> ${locationText}</p>
                            <p><strong>Time:</strong> ${date}</p>
                            <p><strong>Details:</strong> ${report.incident_details || 'N/A'}</p>
                            ${photoHtml}
                        </div>
                    `;
                }).join('');
            } else {
                reportsList.innerHTML = '<p class="text-center">You have no previous emergency reports.</p>';
            }
        }
        
        loadReportsHistory();
    }
    
    // =================================================================
    // BROADCASTS PAGE (broadcasts.html) Logic
    // =================================================================
    if (window.location.pathname.endsWith('/broadcasts.html')) {
        fetchBroadcastHistory();
    }
});