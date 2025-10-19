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

// Define the photo bucket name as a constant
const REPORT_BUCKET = 'emergency_photos'; 

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
            }
        }
    }
}

// --- Geolocation Utility (Using getCurrentPosition) ---
function getLocation(callback) {
    console.log("Attempting to get location...");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("Geolocation success:", position);
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const locationText = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
                callback({ success: true, lat, lon, locationText });
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMessage = "Location not available. Ensure services are enabled.";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = "PERMISSION DENIED: Allow location access.";
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = "TIMEOUT (10s): Signal weak. Try moving & click 'Get Location'.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = "POSITION UNAVAILABLE: Cannot determine location.";
                }
                callback({ success: false, errorMessage });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
        );
    } else {
        console.log("Geolocation not supported by this browser.");
        callback({ success: false, errorMessage: "Geolocation not supported by this browser." });
    }
}

// --- Global Utility: Fetch and Store Profile ---
async function fetchAndStoreProfile(userId, isLoginAttempt = false) {
     try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error || !data) {
            if (isLoginAttempt) {
                console.error('Login profile check failed:', error ? error.message : 'No data');
                return false; 
            }
            console.error('Failed to fetch profile for local storage:', error ? error.message : 'No data');
            return true; 
        }
        
        delete data.id; 
        delete data.created_at; 
        localStorage.setItem('profileData', JSON.stringify(data));
        return true; 
    } catch (e) {
        console.error('Error fetching profile for local storage:', e);
        return isLoginAttempt ? false : true; 
    }
}

// --- PWA Installation Logic ---
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
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
                    const userId = data.user.id;
        
                    const profileExists = await fetchAndStoreProfile(userId, true);
                    
                    if (!profileExists) {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        showMessage('Login failed. Your account data is incomplete. Please re-register.', 'error', 7000);
                        return;
                    }
                    
                    localStorage.setItem('userId', userId);
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
                const gender = document.getElementById('gender')?.value || null; 
                const bloodgrp = document.getElementById('bloodgrp')?.value || null;
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const pincode = document.getElementById('pincode').value;
                const emergency1 = document.getElementById('emergency1').value;
                const emergency2 = document.getElementById('emergency2').value || null;
                const medical = document.getElementById('medical').value || null;
                
                showMessage('Registering...', 'success', 2000);
                
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
        
        const detailsContainer = document.getElementById('profileDetails');

        function displayProfile(profile) {
            if (!detailsContainer || !profile) {
                detailsContainer.innerHTML = '<p>User profile data could not be loaded.</p>';
                return;
            }
            
            detailsContainer.innerHTML = `
                <h2 style="margin-bottom: 15px;">Personal Information</h2>
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
                    <i class="fas fa-edit"></i> Edit Profile
                </button>
            `;
        }

        async function loadProfile() {
            const userId = localStorage.getItem('userId');
            
            if (!userId) {
                detailsContainer.innerHTML = '<p>Error: User not logged in. Redirecting to login...</p>';
                setTimeout(() => window.location.href = 'index.html', 1500);
                return;
            }
            
            localStorage.removeItem('profileData'); 
            
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (error) {
                detailsContainer.innerHTML = `<p>Failed to load profile: ${error.message}</p>`;
                showMessage('Failed to load profile: ' + error.message, 'error', 5000);
                return;
            }
            
            if (data) {
                localStorage.setItem('profileData', JSON.stringify(data));
                displayProfile(data); 
            }
        }
        
        loadProfile();
    }

    // =================================================================
    // REPORT EMERGENCY PAGE (report.html) - SUBMISSION FIX APPLIED HERE
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
        const closeSuccessBtn = document.getElementById('closeSuccessBtn');

        let isFetchingLocation = false;
        let currentLat = null; 
        let currentLon = null; 
        
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
                showMessage('Photo upload failed.', 'error', 3000);
                return null;
            }
            return `${SUPABASE_URL}/storage/v1/object/public/${REPORT_BUCKET}/${uploadData.path}`;
        }

        function handleLocationFetch() {
            if (isFetchingLocation) return;
            isFetchingLocation = true;
            locationTextEl.value = 'Fetching Location...'; 
            latitudeInput.value = ''; 
            longitudeInput.value = '';
            currentLat = null;
            currentLon = null;

            getLocation((result) => {
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
                isFetchingLocation = false;
            });
        }

        handleLocationFetch();

        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', handleLocationFetch);
        }
        
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                successModal.classList.add('hidden');
                reportForm.reset();
                currentLat = null;
                currentLon = null;
                locationTextEl.value = 'Not acquired.'; 
                latitudeInput.value = '';
                longitudeInput.value = '';
                document.getElementById('submitReportBtn').disabled = false;
            });
        }


        // --- REPORT SUBMISSION LOGIC ---
        if (reportForm) {
            reportForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                event.stopImmediatePropagation(); 

                const incidentType = document.getElementById('incidentType').value;
                // FIX: Use the correct ID 'description' for the textarea
                const descriptionValue = document.getElementById('description').value; 
                const severity = document.getElementById('severity').value; 
                
                // Map the description to both relevant DB columns
                const incidentDetails = descriptionValue;
                const additionalContext = descriptionValue;
                
                document.getElementById('submitReportBtn').disabled = true;

                if (!incidentType || incidentType === '') {
                    showMessage('Please select an incident type.', 'error', 4000);
                    document.getElementById('submitReportBtn').disabled = false;
                    return;
                }
                
                // CRUCIAL CHECK: Ensure lat/lon were successfully acquired before submitting
                if (currentLat === null || currentLon === null || locationTextEl.value.includes('Location not available') || locationTextEl.value.includes('PERMISSION DENIED') || locationTextEl.value.includes('TIMEOUT') || locationTextEl.value.includes('Fetching Location')) {
                    showMessage('Valid location is required. Click "Get Location" or ensure permissions are granted.', 'error', 7000);
                    document.getElementById('submitReportBtn').disabled = false;
                    return;
                }

                countdownModal.classList.remove('hidden');
                playSound('countdownSound');
                document.getElementById('countdownMessage').textContent = 'Report sending in...';


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

                        const photoFile = document.getElementById('photo').files[0];
                        let photoUrl = null;

                        try {
                            if (photoFile) {
                                photoUrl = await uploadImage(photoFile, localStorage.getItem('userId'));
                            }
                            
                            // Check if photo upload failed and prevent submission if required (optional, but good)
                            if (photoFile && !photoUrl) {
                                throw new Error("Photo upload failed, stopping report submission.");
                            }

                            const { error: submissionError } = await supabase.from('emergency_reports').insert([
                                { 
                                    user_id: localStorage.getItem('userId'), 
                                    incident_type: incidentType, 
                                    incident_details: incidentDetails, // Uses corrected variable
                                    severity: severity, 
                                    latitude: currentLat, 
                                    longitude: currentLon, 
                                    photo_url: photoUrl,
                                    status: 'Reported', 
                                    additional_context: additionalContext // Uses corrected variable
                                }
                            ]);
                            
                            if (submissionError) {
                                console.error('Submission Error:', submissionError.message);
                                showMessage(`Report submission failed! Check Supabase RLS. (Error: ${submissionError.code})`, 'error', 7000);
                                document.getElementById('submitReportBtn').disabled = false;
                            } else {
                                countdownModal.classList.add('hidden');
                                successModal.classList.remove('hidden');
                                playSound('successSound'); 
                                showMessage('Report submitted successfully!', 'success', 5000);
                                
                                setTimeout(() => {
                                    successModal.classList.add('hidden');
                                    reportForm.reset();
                                    document.getElementById('submitReportBtn').disabled = false;
                                }, 5000);
                            }
                        } catch (e) {
                            console.error('Fatal submission error:', e);
                            showMessage(`An unexpected error occurred during submission: ${e.message}`, 'error', 5000);
                        } finally {
                            countdownModal.classList.add('hidden'); 
                            // Re-enable button on all failure paths
                            document.getElementById('submitReportBtn').disabled = false; 
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
                .from('emergency_reports') 
                .select('timestamp, incident_type, incident_details, additional_context, photo_url, status, severity') 
                .eq('user_id', userId)
                .order('timestamp', { ascending: false });
                
            if (error) {
                reportsList.innerHTML = `<p class="text-center" style="color:#f44336;">Failed to load history: ${error.message}</p>`;
                showMessage('Failed to load history: ' + error.message, 'error', 5000);
                return;
            }
            
            if (data && data.length > 0) {
                reportsList.innerHTML = data.map(report => {
                    const statusClass = report.status === 'Resolved' ? 'status-resolved' : 'status-pending';
                    const statusText = report.status || 'Pending';
                    const date = new Date(report.timestamp).toLocaleString();
                    const severityHtml = report.severity ? `<p class="severity-tag">Severity: ${report.severity}</p>` : '';
                    
                    return `
                        <div class="report-card-history">
                            <div class="report-header">
                                <h4>${report.incident_type}</h4>
                                <span class="report-status ${statusClass}">${statusText}</span>
                            </div>
                            ${severityHtml}
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