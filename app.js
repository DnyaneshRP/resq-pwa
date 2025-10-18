// --- Supabase SDK Imports ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.3/+esm';

// =================================================================
// YOUR SUPABASE CONFIGURATION (VERIFIED)
// =================================================================
const SUPABASE_URL = 'https://ayptiehjxxincwsbtysl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cHRpZWhqeHhpbmN3c2J0eXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTY2NzIsImV4cCI6MjA3NjE3MjY3Mn0.jafnb-fxqWbZm7uJf2g17CgiGzS-MetDY1h0kV-d0vg'; 
// =================================================================

// --- Initialize Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Utility: Custom Message Box & Sound Player ---
function showMessage(message, type = 'success', duration = 3000) {
    const messageBox = document.getElementById('customMessageBox');
    if (!messageBox) return;

    messageBox.className = `custom-message-box hidden ${type}`;
    messageBox.textContent = message;

    // Show
    setTimeout(() => {
        messageBox.classList.remove('hidden');
        messageBox.classList.add('show');
    }, 10); // Small delay to trigger transition

    // Hide
    setTimeout(() => {
        messageBox.classList.remove('show');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 300); // Wait for transition to finish before setting display: none
    }, duration);
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        // Stop and rewind to play again immediately
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(error => {
            // This is common for mobile browsers requiring a user gesture
            console.warn('Audio playback prevented by browser:', error);
        });
    }
}

// --- Global Utility: Drawer Menu ---
function setupDrawerMenu() {
    const menuButton = document.getElementById('menuButton');
    const sideDrawer = document.getElementById('sideDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const logoutButton = document.getElementById('logoutButton');

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sideDrawer.classList.add('open');
            drawerBackdrop.classList.add('active');
        });
    }

    if (closeDrawer) {
        closeDrawer.addEventListener('click', () => {
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('active');
        });
    }

    if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', () => {
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('active');
        });
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            localStorage.clear();
            if (error) {
                showMessage('Logout failed: ' + error.message, 'error');
            } else {
                // Clear all caches and reload to index/login page
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


// --- Global Utility: Check Authentication ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/register.html') || window.location.pathname.endsWith('/')) {
        // On login/register pages
        if (session) {
            window.location.href = 'home.html'; // Already logged in, redirect to home
        }
    } else {
        // On protected pages
        if (!session) {
            window.location.href = 'index.html'; // Not logged in, redirect to login
        } else {
            // Session exists, check if user data is stored locally (for offline use)
            if (!localStorage.getItem('userId')) {
                localStorage.setItem('userId', session.user.id);
                // Optional: Fetch and store profile details here if needed on login, but for speed, we'll fetch on profile.html
            }
        }
    }
}

// --- Geolocation Utility ---
function getLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Reverse Geocoding to get human-readable address
                // Mock address for simplicity
                const locationText = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
                
                callback({ success: true, lat, lon, locationText });
            },
            (error) => {
                console.error("Geolocation error:", error);
                const errorMessage = "Location not available. Please ensure location services are enabled.";
                callback({ success: false, errorMessage });
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        callback({ success: false, errorMessage: "Geolocation is not supported by this browser." });
    }
}

// --- Page Specific Logic Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupDrawerMenu();
    setupPWAInstallPrompt();
    
    // =================================================================
    // LOGIN PAGE (index.html)
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
                    localStorage.setItem('userId', data.user.id);
                    // Fetch and store profile for offline access
                    await fetchAndStoreProfile(data.user.id); 
                    showMessage('Login Successful! Redirecting...', 'success', 1000);
                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 1000);
                }
            });
        }
    }
    
    // =================================================================
    // REGISTER PAGE (register.html)
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
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const pincode = document.getElementById('pincode').value;
                const emergency1 = document.getElementById('emergency1').value;
                const emergency2 = document.getElementById('emergency2').value || null;
                const medical = document.getElementById('medical').value || null;
                
                showMessage('Registering...', 'success', 2000);
                
                // 1. Sign up the user
                const { data: authData, error: authError } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: { full_name: fullname }
                    }
                });
                
                if (authError) {
                    showMessage('Registration Failed: ' + authError.message, 'error', 5000);
                    return;
                }
                
                const userId = authData.user.id;
                
                // 2. Insert profile details
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: userId,
                            full_name: fullname, 
                            phone: phone, 
                            dob: dob, 
                            address: address, 
                            city: city, 
                            pincode: pincode, 
                            emergency_contact_1: emergency1, 
                            emergency_contact_2: emergency2, 
                            medical_conditions: medical
                        }
                    ]);
                    
                if (profileError) {
                    // This is a critical error, log and inform the user
                    console.error('Profile Insert Error:', profileError);
                    showMessage('Registration completed, but failed to save profile details: ' + profileError.message, 'error', 8000);
                    return;
                }
                
                localStorage.setItem('userId', userId);
                showMessage('Registration successful! Redirecting to Home...', 'success', 1000);
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            });
        }
    }

    // =================================================================
    // PROFILE PAGE (profile.html)
    // =================================================================
    if (window.location.pathname.endsWith('/profile.html')) {
        const profileForm = document.getElementById('profileForm');
        
        // Function to fetch and display profile data
        async function loadProfile() {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                showMessage('User not logged in. Redirecting...', 'error', 3000);
                setTimeout(() => window.location.href = 'index.html', 3000);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (error) {
                showMessage('Failed to load profile: ' + error.message, 'error', 5000);
                return;
            }
            
            if (data) {
                // Populate the form fields with fetched data
                document.getElementById('fullname').value = data.full_name || '';
                // The user's email is not in the `profiles` table in this logic, skip or fetch from auth
                // document.getElementById('email').value = data.email || ''; 
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('dob').value = data.dob || '';
                document.getElementById('address').value = data.address || '';
                document.getElementById('city').value = data.city || '';
                document.getElementById('pincode').value = data.pincode || '';
                document.getElementById('emergency1').value = data.emergency_contact_1 || '';
                document.getElementById('emergency2').value = data.emergency_contact_2 || '';
                document.getElementById('medical').value = data.medical_conditions || '';
                
                // Store locally for offline/quick access
                localStorage.setItem('profileData', JSON.stringify(data));
            }
        }
        
        // Load profile on page load
        loadProfile();

        // Handle profile update form submission
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const userId = localStorage.getItem('userId');
                
                const updatedData = {
                    full_name: document.getElementById('fullname').value,
                    phone: document.getElementById('phone').value,
                    dob: document.getElementById('dob').value,
                    address: document.getElementById('address').value,
                    city: document.getElementById('city').value,
                    pincode: document.getElementById('pincode').value,
                    emergency_contact_1: document.getElementById('emergency1').value,
                    emergency_contact_2: document.getElementById('emergency2').value || null,
                    medical_conditions: document.getElementById('medical').value || null
                };
                
                showMessage('Updating profile...', 'success', 2000);
                
                const { error } = await supabase
                    .from('profiles')
                    .update(updatedData)
                    .eq('id', userId);
                    
                if (error) {
                    showMessage('Profile Update Failed: ' + error.message, 'error', 5000);
                } else {
                    // Update local storage after successful update
                    localStorage.setItem('profileData', JSON.stringify({...updatedData, id: userId}));
                    showMessage('Profile updated successfully!', 'success', 3000);
                }
            });
        }
    }

    // =================================================================
    // REPORT EMERGENCY PAGE (report.html)
    // =================================================================
    if (window.location.pathname.endsWith('/report.html')) {
        const reportForm = document.getElementById('reportForm');
        const countdownModal = document.getElementById('countdownModal');
        const successModal = document.getElementById('successModal');
        const countdownTimer = document.getElementById('countdownTimer');
        const getLocationBtn = document.getElementById('getLocationBtn');
        const locationTextEl = document.getElementById('locationText');
        const closeSuccessBtn = document.getElementById('closeSuccessBtn');

        let isFetchingLocation = false;
        
        // Initial location fetch on load
        locationTextEl.value = 'Fetching Location...';
        getLocation((result) => {
            if (result.success) {
                locationTextEl.value = result.locationText;
                document.getElementById('latitude').value = result.lat;
                document.getElementById('longitude').value = result.lon;
                showMessage('Location acquired successfully.', 'success', 3000);
            } else {
                locationTextEl.value = result.errorMessage;
                showMessage(result.errorMessage, 'error', 5000);
            }
            isFetchingLocation = false;
        });

        // Manual location fetch button listener
        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => {
                if (isFetchingLocation) return;
                isFetchingLocation = true;
                locationTextEl.value = 'Fetching Location...';
                document.getElementById('latitude').value = '';
                document.getElementById('longitude').value = '';

                getLocation((result) => {
                    if (result.success) {
                        locationTextEl.value = result.locationText;
                        document.getElementById('latitude').value = result.lat;
                        document.getElementById('longitude').value = result.lon;
                        showMessage('Location updated successfully.', 'success', 3000);
                    } else {
                        locationTextEl.value = result.errorMessage;
                        showMessage(result.errorMessage, 'error', 5000);
                    }
                    isFetchingLocation = false;
                });
            });
        }
        
        // Listener for closing success modal
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                successModal.classList.add('hidden');
            });
        }

        // --- FIXED Report Submission Logic ---
        if (reportForm) {
            reportForm.addEventListener('submit', async function(event) {
                // FIX: Prevent default form submission and stop immediate propagation 
                event.preventDefault();
                event.stopImmediatePropagation(); 

                const incidentType = document.getElementById('incidentType').value;
                const locationText = document.getElementById('locationText').value;

                // FIX: Enforce input validation. 
                if (!incidentType || incidentType === '') {
                    showMessage('Please select an incident type.', 'error', 4000);
                    return;
                }
                
                if (!locationText || locationText === 'Fetching Location...' || locationText.includes('Location not available')) {
                    showMessage('Please wait for a valid location or click "Get Location" to try again.', 'error', 5000);
                    return;
                }

                // FIX: Show Countdown Modal and play sound immediately
                countdownModal.classList.remove('hidden');
                playSound('countdownSound');

                // 2. Start Countdown (3, 2, 1)
                let count = 3;
                countdownTimer.textContent = count;

                const countdownInterval = setInterval(async () => {
                    count--;
                    countdownTimer.textContent = count;
                    
                    if (count > 0) {
                        playSound('countdownSound'); // Re-play sound for 2 and 1
                    }

                    if (count <= 0) {
                        clearInterval(countdownInterval);
                        
                        // 3. Process Submission
                        const incidentDetails = document.getElementById('incidentDetails').value;
                        const latitude = document.getElementById('latitude').value;
                        const longitude = document.getElementById('longitude').value;
                        const photoFile = document.getElementById('photo').files[0];
                        
                        let photoUrl = null;

                        try {
                             // Handle file upload (requires Supabase storage bucket setup)
                            if (photoFile) {
                                showMessage('Uploading photo...', 'success', 1000);
                                const filePath = `${localStorage.getItem('userId')}/${Date.now()}-${photoFile.name}`;
                                const { data: uploadData, error: uploadError } = await supabase.storage
                                    .from('incident_photos') // Assuming a bucket named 'incident_photos'
                                    .upload(filePath, photoFile);
                                    
                                if (uploadError) {
                                    console.error('Photo Upload Error:', uploadError.message);
                                    // Continue submission without photo
                                } else {
                                     // Get public URL 
                                     photoUrl = `${SUPABASE_URL}/storage/v1/object/public/incident_photos/${uploadData.path}`;
                                }
                            }
                            
                            // Submit report to Supabase
                            const { error: submissionError } = await supabase.from('reports').insert([
                                { 
                                    user_id: localStorage.getItem('userId'), 
                                    type: incidentType, 
                                    details: incidentDetails, 
                                    location: locationText, 
                                    lat: latitude, 
                                    lon: longitude,
                                    photo_url: photoUrl
                                }
                            ]);
                            
                            if (submissionError) {
                                console.error('Submission Error:', submissionError.message);
                                showMessage(`Failed to submit report: ${submissionError.message}`, 'error', 5000);
                            } else {
                                // 4. Hide Countdown & Show Success Modal
                                countdownModal.classList.add('hidden');
                                successModal.classList.remove('hidden');
                                playSound('successSound'); // Play success sound
                                
                                // Clear form inputs and re-fetch location
                                reportForm.reset();
                                locationTextEl.value = 'Fetching Location...'; 
                                getLocation((result) => {
                                    if (result.success) {
                                        locationTextEl.value = result.locationText;
                                        document.getElementById('latitude').value = result.lat;
                                        document.getElementById('longitude').value = result.lon;
                                    } else {
                                        locationTextEl.value = result.errorMessage;
                                    }
                                });
                                
                                // Auto-hide success modal after 5 seconds
                                setTimeout(() => {
                                    successModal.classList.add('hidden');
                                }, 5000);
                            }
                        } catch (e) {
                            console.error('Fatal submission error:', e);
                            showMessage('An unexpected error occurred during submission.', 'error', 5000);
                        } finally {
                             // Ensure modal hides on any error path
                            countdownModal.classList.add('hidden'); 
                        }
                    }
                }, 1000);
            });
        }
    }
    
    // =================================================================
    // HISTORY PAGE (history.html)
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

            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
                
            if (error) {
                reportsList.innerHTML = `<p class="text-center" style="color:#f44336;">Failed to load history: ${error.message}</p>`;
                showMessage('Failed to load history: ' + error.message, 'error', 5000);
                return;
            }
            
            if (data && data.length > 0) {
                reportsList.innerHTML = data.map(report => {
                    const statusClass = report.status === 'Resolved' ? 'status-resolved' : 'status-pending';
                    const statusText = report.status || 'Pending';
                    const date = new Date(report.created_at).toLocaleString();
                    
                    return `
                        <div class="report-card-history">
                            <div class="report-header">
                                <h4>${report.type}</h4>
                                <span class="report-status ${statusClass}">${statusText}</span>
                            </div>
                            <p><strong>Location:</strong> ${report.location}</p>
                            <p><strong>Time:</strong> ${date}</p>
                            <p><strong>Details:</strong> ${report.details || 'N/A'}</p>
                            ${report.photo_url ? `<p><a href="${report.photo_url}" target="_blank" style="color:#d32f2f; font-weight: 600;">View Attached Photo</a></p>` : ''}
                        </div>
                    `;
                }).join('');
            } else {
                reportsList.innerHTML = '<p class="text-center">You have no previous emergency reports.</p>';
            }
        }
        
        loadReportsHistory();
    }
});


// --- PWA Installation Logic ---
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Check if we should show our custom install promotion
    if (!localStorage.getItem('pwaPromptShown')) {
        showInstallPromotionModal();
    }
});

function setupPWAInstallPrompt() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    deferredPrompt = null;
                    const pwaModal = document.getElementById('pwaModal');
                    if (pwaModal) pwaModal.remove();
                });
            }
        });
    }
}

function showInstallPromotionModal() {
    localStorage.setItem('pwaPromptShown', 'true');
    const modalHtml = `
        <div id="pwaModal" class="modal-overlay">
            <div class="modal-content" style="text-align: center;">
                <i class="fas fa-heartbeat pwa-icon" style="font-size: 3em; color: #d32f2f; margin-bottom: 15px;"></i>
                <h2>Install ResQ - Your Safety App</h2>
                <p>Install the ResQ app to get quick access to emergency features and use it even when you're offline. Get the full app experience!</p>
                <button id="installButton" class="primary-btn" style="width: 100%; margin: 15px 0;">Install App Now</button>
                <button id="dismissButton" class="secondary-btn" style="width: 100%;">Not now, continue to website</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const pwaModal = document.getElementById('pwaModal');
    
    document.getElementById('installButton').addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
                pwaModal.remove();
            });
        }
    });
    
    document.getElementById('dismissButton').addEventListener('click', () => {
        pwaModal.remove();
    });
}

// Function to fetch and store profile data (called after successful login/register)
async function fetchAndStoreProfile(userId) {
     try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (!error && data) {
            // Remove sensitive or unnecessary fields before storing locally
            delete data.id; 
            delete data.created_at; 
            localStorage.setItem('profileData', JSON.stringify(data));
        } else {
            console.error('Failed to fetch profile for local storage:', error ? error.message : 'No data');
        }
    } catch (e) {
        console.error('Error fetching profile for local storage:', e);
    }
}