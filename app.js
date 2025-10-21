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

// Define constants
const REPORT_BUCKET = 'emergency_photos'; 
const OFFLINE_QUEUE_KEY = '__REPORTS_QUEUE__'; // Key for localStorage queue

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
            console.warn('Audio playback prevented by browser:', error);
        });
    }
}

// --- Global Utility: Fetch and Store Profile ---
// **NEW HELPER:** Fetches profile data with a 5-second timeout.
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
        // Use the new timeout-protected fetch
        const { data, error } = await fetchProfileWithTimeout(userId);
            
        if (error) {
            throw new Error(error.message);
        }

        if (data) {
            // Remove sensitive or unnecessary fields before storing locally
            delete data.id; 
            delete data.created_at; 
            localStorage.setItem('profileData', JSON.stringify(data));
            return true;
        } else {
             // Happens if .single() finds no row but doesn't throw a formal error
            throw new Error('Profile data record is missing from the database.');
        }
    } catch (e) {
        console.error('Error fetching profile for local storage:', e);
        // Fallback: If local storage has data, assume success for auth check
        return !!localStorage.getItem('profileData');
    }
}

// --- Global Utility: Set Drawer Header (FIXED: Uses fullname) ---
function setDrawerHeader() {
    const drawerTitle = document.getElementById('drawerTitle');
    if (!drawerTitle) return;

    const profileDataString = localStorage.getItem('profileData');
    if (profileDataString) {
        try {
            const profile = JSON.parse(profileDataString);
            // Check for the correct database column name: fullname
            if (profile.fullname && profile.fullname.trim() !== '') {
                // Extract only the first word as the first name
                const firstName = profile.fullname.split(' ')[0];
                // Set the header to "Hello, [User]"
                drawerTitle.textContent = `Hello, ${firstName}`;
                return;
            }
        } catch (e) {
            console.error('Error parsing profile data:', e);
        }
    }
    // Default text if no name is found or profile data is missing
    drawerTitle.textContent = 'ResQ Menu';
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
            drawerBackdrop.classList.add('show'); 
            setDrawerHeader(); // Re-check header content on opening
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


// --- Global Utility: Check Authentication (FIXED: Ensures name is loaded) ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    let profileLoaded = false;
    
    // Check if on unprotected pages (login/register/root)
    if (window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/register.html') || window.location.pathname.endsWith('/')) {
        if (session) {
            window.location.href = 'home.html'; 
        }
    } else {
        // Protected pages
        if (!session) {
            window.location.href = 'index.html'; 
        } else {
            const userId = session.user.id;
            if (!localStorage.getItem('userId')) {
                localStorage.setItem('userId', userId);
            }
            
            // CRITICAL FIX: Ensure profile data exists AND is up-to-date
            const profileData = localStorage.getItem('profileData');
            let profile = profileData ? JSON.parse(profileData) : {};

            if (!profileData || !profile.fullname || profile.fullname.trim() === '') {
                // If profile is missing or name is empty, fetch it
                profileLoaded = await fetchAndStoreProfile(userId);
            } else {
                profileLoaded = true;
            }
            
            // If profile still couldn't be loaded/stored, it's a serious issue, redirect to login
            if (!profileLoaded) {
                 showMessage('Critical Error: Failed to load user profile. Please log in again.', 'error', 10000);
                 await supabase.auth.signOut();
                 localStorage.clear();
                 setTimeout(() => window.location.href = 'index.html', 500); 
            }
        }
    }
    return profileLoaded;
}

// --- Geolocation Utility ---
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
    
    // Get the public URL for the newly uploaded file
    const { data: { publicUrl } } = supabase.storage.from(REPORT_BUCKET).getPublicUrl(filePath);
    return publicUrl;
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
    queue.push(reportPayload);
    saveQueuedReports(queue);
    showMessage('Report saved offline. Will send automatically when connection is restored.', 'info', 7000);
}

// Function that runs on load to attempt to send queued reports
async function attemptQueuedReports() {
    const queue = getQueuedReports();
    if (queue.length === 0) return;

    if (!navigator.onLine) {
        console.log('Offline: Cannot send queued reports now.');
        return;
    }
    
    let reportsSent = 0;
    const failedQueue = [];

    showMessage(`Connection restored! Attempting to send ${queue.length} queued reports...`, 'success', 5000);

    for (const report of queue) {
        // Photo URL will be null since files can't be queued, only text data
        const { error } = await supabase.from('emergency_reports').insert([report]);

        if (error) {
            console.error('Failed to send queued report:', error.message, report);
            // Re-queue the report if sending fails
            failedQueue.push(report); 
        } else {
            reportsSent++;
        }
    }

    if (reportsSent > 0) {
        showMessage(`Successfully sent ${reportsSent} queued report(s).`, 'success', 5000);
    }
    
    // Update the queue: keep only the failed reports
    saveQueuedReports(failedQueue);
}

// =================================================================
// --- Page Specific Logic Initialization (MADE ASYNC) ---
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // +++ Service Worker Registration +++
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js') 
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // Await checkAuth to ensure profile is loaded (FIXED for name retrieval robustness)
    await checkAuth(); 
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
                    setDrawerHeader(); // Set header with fresh data
                    showMessage('Login Successful! Redirecting...', 'success', 1000);
                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 1000);
                }
            });
        }
    }
    
    // =================================================================
    // REGISTER PAGE (register.html) Logic
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
                
                // Step 1: Auth sign up
                const { data: authData, error: authError } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        // Using 'fullname' for user metadata to be consistent, though table insert is the main data source
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
                await fetchAndStoreProfile(userId); // Store the complete profile with name
                setDrawerHeader(); // Set header with fresh data
                showMessage('Registration successful! Redirecting to Home...', 'success', 1000);
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            });
        }
    }

    // =================================================================
    // PROFILE PAGE (profile.html) Logic
    // =================================================================

    if (window.location.pathname.endsWith('/profile.html')) {
        
        const detailsContainer = document.getElementById('profileDetailsContainer');

        // Helper to display content in the correct container
        function updateProfileDisplay(htmlContent) {
            if (detailsContainer) {
                detailsContainer.innerHTML = htmlContent;
            }
        }

        function displayProfile(profile) {
            if (!profile) {
                updateProfileDisplay('<p class="text-center">User profile data could not be loaded.</p>');
                return;
            }
            
            // Generate HTML structure based on the data
            const html = `
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
                    <p>${profile.city || 'N/A'}${profile.pincode ? ` - ${profile.pincode}` : ''}</p>
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

                <button type="button" class="main-button" style="margin-top: 30px;">Edit Profile (Future Feature)</button>
            `;
            
            updateProfileDisplay(html);
        }

        async function loadProfile() {
            const userId = localStorage.getItem('userId');
            
            if (!userId) {
                updateProfileDisplay('<p class="text-center" style="color:#f44336;">Error: User not logged in.</p>');
                return;
            }
            
            // Set the loading state before fetching
            updateProfileDisplay(`
                <div class="text-center" style="margin-top: 50px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #d32f2f;"></i>
                    <p>Loading user data...</p>
                </div>
            `);
            
            try {
                // Use the timeout-protected fetch
                const { data, error } = await fetchProfileWithTimeout(userId);
                
                // If Supabase returned an error object (e.g., bad query or RLS permission denied)
                if (error) { 
                    throw new Error(error.message); 
                }

                if (data) {
                    // Success
                    localStorage.setItem('profileData', JSON.stringify(data));
                    displayProfile(data); 
                } else {
                    // .single() returning null data
                    throw new Error("Profile record not found for this user ID.");
                }

            } catch (e) {
                // This block catches all errors: Supabase errors, network errors, and the custom timeout error.
                console.error("Profile loading error:", e.message);

                const localData = localStorage.getItem('profileData');
                if (localData) {
                    // Fallback to local data if connection fails or times out
                    showMessage(`Could not connect to update profile. Using offline data. (${e.message})`, 'info', 7000);
                    displayProfile(JSON.parse(localData));
                    return;
                }
                
                // Show final error message
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


        // --- REPORT SUBMISSION LOGIC ---
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
                const descriptionValue = rawDescription || 'No details provided by user.'; // Fix for NOT NULL constraint
                const severity = document.getElementById('severity').value; 
                
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

                // Start countdown
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

                        const photoFile = document.getElementById('photo').files[0];
                        let photoUrl = null;

                        // 1. Photo Upload (Only possible if online)
                        if (photoFile && navigator.onLine) {
                            photoUrl = await uploadImage(photoFile, userId); 
                        } else if (photoFile && !navigator.onLine) {
                             showMessage("You are offline. Cannot upload photo; report will be queued without image.", 'warning', 7000);
                        }

                        // 2. Prepare payload 
                        const reportPayload = { 
                            user_id: userId, 
                            incident_type: incidentType, 
                            incident_details: descriptionValue, 
                            severity_level: severity, 
                            latitude: currentLat, 
                            longitude: currentLon, 
                            photo_url: photoUrl,
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
                                }
                            } catch (e) {
                                console.error('Fatal submission error:', e);
                                showMessage(`An unexpected error occurred: ${e.message}`, 'error', 5000);
                            }
                        } else {
                            // OFFLINE QUEUE: If submission fails because we are offline
                            reportPayload.photo_url = null; // Cannot queue file blobs, rely on text data
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

            // Select all columns including photo_url to check for photo link generation
            const { data, error } = await supabase
                .from('emergency_reports') 
                .select('*') 
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
                    const statusText = report.status || 'Reported'; 
                    const date = new Date(report.timestamp).toLocaleString();
                    const severityHtml = report.severity_level ? `<p class="severity-tag">Severity: ${report.severity_level}</p>` : '';
                    
                    // Location shows Lat/Lon
                    const locationText = (report.latitude && report.longitude) 
                        ? `Lat: ${report.latitude.toFixed(4)}, Lon: ${report.longitude.toFixed(4)}`
                        : 'Location not recorded';
                        
                    // Handle photo URL and generate public URL
                    let photoHtml = '';
                    if (report.photo_url) {
                        // Re-integrate the getPhotoPublicUrl logic here for completeness if needed, 
                        // but since it was removed in previous step, I'll rely on the simplified photo_url usage for now, 
                        // as it was in the original snippet. If the photo_url in the DB is the full public URL, this is fine.
                        // Assuming photo_url is a path and needs the helper from an earlier version:
                        let publicUrl = report.photo_url;
                        if (!publicUrl.startsWith('http')) {
                            try {
                                const { data: urlData } = supabase.storage
                                    .from(REPORT_BUCKET)
                                    .getPublicUrl(report.photo_url);
                                publicUrl = urlData.publicUrl;
                            } catch(e) { /* ignore error, use default */ }
                        }

                        if (publicUrl) {
                             photoHtml = `<p><a href="${publicUrl}" target="_blank" class="text-link">View Attached Photo</a></p>`;
                        }
                    }

                    return `
                        <div class="report-card-history">
                            <div class="report-header">
                                <h4>${report.incident_type}</h4>
                                <span class="report-status ${statusClass}">${statusText}</span>
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
});