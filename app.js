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
    // REGISTER PAGE (register.html) - UPDATED FOR NEW SCHEMA
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
                // Note: Assuming 'gender' and 'bloodgrp' are NOT in the form, 
                // so we insert null, aligning with the schema's NULL constraint.
                const gender = document.getElementById('gender')?.value || null; 
                const bloodgrp = document.getElementById('bloodgrp')?.value || null;
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
                        data: { full_name: fullname } // Storing in auth user metadata for convenience
                    }
                });
                
                if (authError) {
                    showMessage('Registration Failed: ' + authError.message, 'error', 5000);
                    return;
                }
                
                const userId = authData.user.id;
                
                // 2. Insert profile details (using the correct schema column names)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: userId,
                            fullname: fullname,             // UPDATED
                            email: email,                   // ADDED
                            phone: phone, 
                            dob: dob, 
                            gender: gender,                 // ADDED
                            bloodgrp: bloodgrp,             // ADDED
                            address: address, 
                            city: city, 
                            pincode: pincode, 
                            emergency1: emergency1,         // UPDATED
                            emergency2: emergency2,         // UPDATED
                            medical: medical                // UPDATED
                        }
                    ]);
                    
                if (profileError) {
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
    // PROFILE PAGE (profile.html) - UPDATED FOR NEW SCHEMA DISPLAY
    // =================================================================
    if (window.location.pathname.endsWith('/profile.html')) {
        
        const detailsContainer = document.getElementById('profileDetails');

        // Helper function to render profile data (Display-only view)
        function displayProfile(profile) {
            if (!detailsContainer || !profile) {
                detailsContainer.innerHTML = '<p>User profile data could not be loaded.</p>';
                return;
            }
            
            // Display all fields from the new schema
            detailsContainer.innerHTML = `
                <div class="profile-group">
                    <p><strong>Full Name:</strong> ${profile.fullname || 'N/A'}</p>
                    <p><strong>Email:</strong> ${profile.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${profile.phone || 'N/A'}</p>
                    <p><strong>Date of Birth:</strong> ${profile.dob || 'N/A'}</p>
                    <p><strong>Gender:</strong> ${profile.gender || 'N/A'}</p>
                    <p><strong>Blood Group:</strong> ${profile.bloodgrp || 'N/A'}</p>
                </div>
                
                <h2 style="margin-top: 15px;">Address</h2>
                <div class="profile-group">
                    <p>${profile.address || 'N/A'}</p>
                    <p>${profile.city || 'N/A'} - ${profile.pincode || 'N/A'}</p>
                </div>
                
                <h2 style="margin-top: 15px;">Emergency Contacts</h2>
                <div class="profile-group">
                    <p><strong>Contact 1:</strong> ${profile.emergency1 || 'N/A'}</p>
                    <p><strong>Contact 2:</strong> ${profile.emergency2 || 'N/A'}</p>
                </div>
                
                <h2 style="margin-top: 15px;">Medical Information</h2>
                <div class="profile-group">
                    <p><strong>Conditions:</strong> ${profile.medical || 'None specified.'}</p>
                </div>
                
                <button id="editProfileBtn" class="primary-btn" style="margin-top: 20px;">
                    <i class="fas fa-edit"></i> Edit Profile (Placeholder)
                </button>
            `;
        }


        // Function to fetch and display profile data
        async function loadProfile() {
            const userId = localStorage.getItem('userId');
            
            if (!userId) {
                detailsContainer.innerHTML = '<p>Error: User not logged in. Redirecting to login...</p>';
                setTimeout(() => window.location.href = 'index.html', 1500);
                return;
            }
            
            // Check cache first
            const cachedProfile = localStorage.getItem('profileData');
            if (cachedProfile) {
                // Display cached data immediately
                displayProfile(JSON.parse(cachedProfile));
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (error) {
                // Only show error if no cached data was available
                if (!cachedProfile) {
                    detailsContainer.innerHTML = `<p>Failed to load profile: ${error.message}</p>`;
                    showMessage('Failed to load profile: ' + error.message, 'error', 5000);
                }
                return;
            }
            
            if (data) {
                // Store locally and display
                localStorage.setItem('profileData', JSON.stringify(data));
                displayProfile(data); 
            }
        }
        
        loadProfile();
    }

    // =================================================================
    // REPORT EMERGENCY PAGE (report.html)
    // (Retains fix from previous step to use 'emergency_reports' table)
    // =================================================================
    if (window.location.pathname.endsWith('/report.html')) {
        const reportForm = document.getElementById('emergencyReportForm'); 
        const countdownModal = document.getElementById('countdownModal');
        const successModal = document.getElementById('successModal');
        const countdownTimer = document.getElementById('countdownTimer');
        const getLocationBtn = document.getElementById('getLocationBtn');
        const locationTextEl = document.getElementById('location'); 
        const closeSuccessBtn = document.getElementById('closeSuccessBtn');

        let isFetchingLocation = false;
        let currentLat = null; 
        let currentLon = null; 
        
        // Helper function to upload image 
        async function uploadImage(file, userId) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            showMessage('Uploading photo...', 'info', 2000);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('incident_photos') 
                .upload(filePath, file);
                
            if (uploadError) {
                console.error('Photo Upload Error:', uploadError.message);
                showMessage('Photo upload failed.', 'error', 3000);
                return null;
            }
            // Supabase returns a path; construct the full public URL
            return `${SUPABASE_URL}/storage/v1/object/public/incident_photos/${uploadData.path}`;
        }

        // Initial location fetch on load
        locationTextEl.value = 'Fetching Location...';
        getLocation((result) => {
            if (result.success) {
                locationTextEl.value = result.locationText;
                currentLat = result.lat;
                currentLon = result.lon;
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
                currentLat = null;
                currentLon = null;

                getLocation((result) => {
                    if (result.success) {
                        locationTextEl.value = result.locationText;
                        currentLat = result.lat;
                        currentLon = result.lon;
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
                // Ensure form resets and re-enables
                reportForm.reset();
                currentLat = null;
                currentLon = null;
                locationTextEl.value = 'Location Cleared';
                document.getElementById('submitReportBtn').disabled = false;
            });
        }


        // --- REPORT SUBMISSION LOGIC (FIXED FOR SCHEMA) ---
        if (reportForm) {
            reportForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                event.stopImmediatePropagation(); 

                const incidentType = document.getElementById('incidentType').value;
                const description = document.getElementById('description').value; 
                
                document.getElementById('submitReportBtn').disabled = true;

                // Enforce validation
                if (!incidentType || incidentType === '') {
                    showMessage('Please select an incident type.', 'error', 4000);
                    document.getElementById('submitReportBtn').disabled = false;
                    return;
                }
                
                if (!currentLat || !currentLon) {
                    showMessage('Please wait for a valid location or click "Get Location" to try again.', 'error', 5000);
                    document.getElementById('submitReportBtn').disabled = false;
                    return;
                }

                // Show Countdown Modal and play sound immediately
                countdownModal.classList.remove('hidden');
                playSound('countdownSound');
                document.getElementById('countdownMessage').textContent = 'Report sending in...';


                // 2. Start Countdown (3, 2, 1)
                let count = 3;
                countdownTimer.textContent = count;

                const countdownInterval = setInterval(async () => {
                    count--;
                    countdownTimer.textContent = count;
                    
                    if (count > 0) {
                        playSound('countdownSound'); 
                    }

                    if (count <= 0) {
                        clearInterval(countdownInterval);
                        document.getElementById('countdownMessage').textContent = 'Sending...';

                        // 3. Process Submission
                        const photoFile = document.getElementById('photo').files[0];
                        let photoUrl = null;

                        try {
                            if (photoFile) {
                                photoUrl = await uploadImage(photoFile, localStorage.getItem('userId'));
                            }
                            
                            // Using 'emergency_reports' table and correct column names
                            const { error: submissionError } = await supabase.from('emergency_reports').insert([
                                { 
                                    user_id: localStorage.getItem('userId'), 
                                    incident_type: incidentType, 
                                    incident_details: description, 
                                    latitude: currentLat, 
                                    longitude: currentLon, 
                                    photo_url: photoUrl,
                                    status: 'Reported', 
                                    additional_context: locationTextEl.value 
                                }
                            ]);
                            
                            if (submissionError) {
                                console.error('Submission Error:', submissionError.message);
                                showMessage(`Report submission failed! CRITICAL: Check Supabase RLS policies. (Error: ${submissionError.code})`, 'error', 7000);
                                document.getElementById('submitReportBtn').disabled = false;
                            } else {
                                // Success! Show modal
                                countdownModal.classList.add('hidden');
                                successModal.classList.remove('hidden');
                                playSound('successSound'); 
                                showMessage('Report submitted successfully!', 'success', 5000);
                                
                                // Auto-hide success modal after 5 seconds
                                setTimeout(() => {
                                    successModal.classList.add('hidden');
                                    reportForm.reset();
                                    document.getElementById('submitReportBtn').disabled = false;
                                }, 5000);
                            }
                        } catch (e) {
                            console.error('Fatal submission error:', e);
                            showMessage('An unexpected error occurred during submission.', 'error', 5000);
                        } finally {
                            countdownModal.classList.add('hidden'); 
                            if (!successModal.classList.contains('hidden')) {
                                document.getElementById('submitReportBtn').disabled = false; 
                            }
                        }
                    }
                }, 1000);
            });
        }
    }
    
    // =================================================================
    // HISTORY PAGE (history.html)
    // (Assuming history needs to display from 'emergency_reports' now)
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

            // Fetches from the correct table, 'emergency_reports', and selects the correct columns
            const { data, error } = await supabase
                .from('emergency_reports') 
                .select('timestamp, incident_type, incident_details, additional_context, photo_url, status')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false });
                
            if (error) {
                reportsList.innerHTML = `<p class="text-center" style="color:#f44336;">Failed to load history: ${error.message}</p>`;
                showMessage('Failed to load history: ' + error.message, 'error', 5000);
                return;
            }
            
            if (data && data.length > 0) {
                reportsList.innerHTML = data.map(report => {
                    // Assuming your status column uses 'Reported' or 'Resolved'
                    const statusClass = report.status === 'Resolved' ? 'status-resolved' : 'status-pending';
                    const statusText = report.status || 'Pending';
                    const date = new Date(report.timestamp).toLocaleString();
                    
                    return `
                        <div class="report-card-history">
                            <div class="report-header">
                                <h4>${report.incident_type}</h4>
                                <span class="report-status ${statusClass}">${statusText}</span>
                            </div>
                            <p><strong>Location:</strong> ${report.additional_context || 'N/A'}</p>
                            <p><strong>Time:</strong> ${date}</p>
                            <p><strong>Details:</strong> ${report.incident_details || 'N/A'}</p>
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