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
            // Fetch email from auth.api.getUser()
            const { data: { user } } = await supabase.auth.getUser();
            
            const fullProfile = {
                ...data,
                email: user.email 
            };
            
            // Remove sensitive or unnecessary fields before storing locally
            delete fullProfile.id; 
            delete fullProfile.created_at; 
            localStorage.setItem('profileData', JSON.stringify(fullProfile));
            return fullProfile;
        } else {
            console.error('Failed to fetch profile for local storage:', error ? error.message : 'No data');
            return null;
        }
    } catch (e) {
        console.error('Error fetching profile for local storage:', e);
        return null;
    }
}

// --- PWA Install Prompt Setup ---
let deferredPrompt;

function setupPWAInstallPrompt() {
    const pwaModal = document.getElementById('pwaModal');
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 76 and later from showing the mini-infobar
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Show the modal to the user
        if (pwaModal) {
             pwaModal.classList.remove('hidden');
        }
    });

    if (pwaModal) {
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
                    pwaModal.classList.add('hidden'); // Hide modal instead of remove
                });
            }
        });
        
        document.getElementById('dismissButton').addEventListener('click', () => {
            pwaModal.classList.add('hidden'); // Hide modal
        });
    }
}

// --- PROFILE PAGE LOGIC (FIXED) ---

function displayProfile(profile) {
    const detailsContainer = document.getElementById('profileDetails');
    if (!detailsContainer || !profile) {
        detailsContainer.innerHTML = '<p>User profile data could not be loaded.</p>';
        return;
    }

    detailsContainer.innerHTML = `
        <div class="profile-card">
            <h2>${profile.full_name}</h2>
            <div class="profile-item"><i class="fas fa-envelope fa-fw"></i> <span>${profile.email || 'N/A'}</span></div>
            <div class="profile-item"><i class="fas fa-phone fa-fw"></i> <span>${profile.phone}</span></div>
            <div class="profile-item"><i class="fas fa-birthday-cake fa-fw"></i> <span>Date of Birth: ${profile.dob}</span></div>
            <div class="profile-item"><i class="fas fa-map-marker-alt fa-fw"></i> <span>Address: ${profile.address}, ${profile.city} - ${profile.pincode}</span></div>
            <hr>
            <h3>Emergency Contacts</h3>
            <div class="profile-item"><i class="fas fa-user-plus fa-fw"></i> <span>Contact 1: ${profile.emergency_contact_1}</span></div>
            ${profile.emergency_contact_2 ? `<div class="profile-item"><i class="fas fa-user-plus fa-fw"></i> <span>Contact 2: ${profile.emergency_contact_2}</span></div>` : ''}
            <hr>
            <h3>Medical Information</h3>
            <div class="profile-item"><i class="fas fa-notes-medical fa-fw"></i> <span>${profile.medical_conditions || 'None specified.'}</span></div>
        </div>
        <button id="editProfileBtn" class="primary-btn" style="margin-top: 20px;">
            <i class="fas fa-edit"></i> Edit Profile
        </button>
    `;
}

async function fetchAndDisplayProfile() {
    const userId = localStorage.getItem('userId');
    const detailsContainer = document.getElementById('profileDetails');
    
    if (!userId) {
        detailsContainer.innerHTML = '<p>Error: User not logged in. Redirecting to login...</p>';
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    // Use the existing fetchAndStoreProfile utility to get the data
    const fullProfile = await fetchAndStoreProfile(userId);

    if (fullProfile) {
        displayProfile(fullProfile);
    } else {
        detailsContainer.innerHTML = '<p>Error loading profile data. Please check your internet connection and try again.</p>';
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
                    console.error('Profile insertion failed:', profileError.message);
                    showMessage('Registration failed (Profile error). Please try again.', 'error', 5000);
                    return;
                }

                showMessage('Registration Successful! Please log in.', 'success', 3000);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);

            });
        }
    }
    
    // =================================================================
    // PROFILE PAGE (profile.html) (FIXED)
    // =================================================================
    if (window.location.pathname.endsWith('/profile.html')) {
        const cachedProfile = localStorage.getItem('profileData');
        
        if (cachedProfile) {
            // Display cached data immediately
            displayProfile(JSON.parse(cachedProfile));
            // Then fetch updated data in the background (good practice)
            fetchAndDisplayProfile(); 
        } else {
            // No cache, fetch and display
            fetchAndDisplayProfile();
        }
    }

    // =================================================================
    // REPORT PAGE (report.html) (CONFIRMED CORRECT)
    // =================================================================
    if (window.location.pathname.endsWith('/report.html')) {
        const reportForm = document.getElementById('emergencyReportForm');
        const submitBtn = document.getElementById('submitReportBtn');
        const countdownModal = document.getElementById('countdownModal');
        const successModal = document.getElementById('successModal');
        const closeSuccessBtn = document.getElementById('closeSuccessBtn');
        const locationBtn = document.getElementById('getLocationBtn');
        const locationInput = document.getElementById('location');
        
        // Store current latitude and longitude globally for the page
        let currentLat = null;
        let currentLon = null;
        
        // Helper function to upload image to Supabase Storage
        async function uploadImage(file, userId) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            // Show a temporary message for upload start
            showMessage('Uploading photo...', 'info', 2000);

            const { data, error } = await supabase.storage
                .from('report_photos')
                .upload(filePath, file);

            if (error) {
                console.error('Image upload failed:', error);
                showMessage('Photo upload failed.', 'error', 3000);
                return null;
            }
            // Return the full path/key which can be used to construct the URL
            return filePath;
        }

        // 1. Get Location Handler
        locationBtn?.addEventListener('click', () => {
            locationInput.value = 'Finding location...';
            locationBtn.disabled = true;
            showMessage('Attempting to get location...', 'info');

            getLocation(({ success, lat, lon, locationText, errorMessage }) => {
                locationBtn.disabled = false;
                if (success) {
                    currentLat = lat;
                    currentLon = lon;
                    locationInput.value = locationText;
                    showMessage('Location found.', 'success');
                } else {
                    locationInput.value = 'Location not available';
                    showMessage(errorMessage, 'error', 5000);
                }
            });
        });

        // 2. Submission Finalizer - This runs AFTER the countdown
        async function submitEmergencyReport(formData) {
            const userId = localStorage.getItem('userId');
            let photoUrl = null;
            const photoFile = formData.get('photo');

            if (photoFile && photoFile.size > 0) {
                photoUrl = await uploadImage(photoFile, userId);
            }

            const reportData = {
                user_id: userId,
                incident_type: formData.get('incidentType'),
                description: formData.get('description'),
                latitude: currentLat,
                longitude: currentLon,
                location_text: formData.get('location'),
                photo_url: photoUrl, // Store path or null
                status: 'pending' // Initial status
            };

            const { error } = await supabase
                .from('emergency_reports')
                .insert([reportData]);

            countdownModal.classList.add('hidden'); // Hide countdown modal

            if (error) {
                console.error('Report submission failed:', error);
                // This is the correct error handling logic if the database insert fails
                showMessage('Failed to submit report. Offline saving is not yet implemented.', 'error', 5000);
                submitBtn.disabled = false; // Re-enable button on failure
            } else {
                playSound('successSound'); // Plays the success sound
                successModal.classList.remove('hidden'); // Show success modal
                showMessage('Report submitted successfully!', 'success', 5000);
            }
        }

        // 3. Countdown Logic
        function startCountdown(formData) {
            let count = 3;
            const countdownTimerDisplay = document.getElementById('countdownTimer');
            const countdownMessageDisplay = document.getElementById('countdownMessage');
            countdownModal.classList.remove('hidden');

            // Set initial display
            countdownTimerDisplay.textContent = count;
            countdownMessageDisplay.textContent = 'Report sending in...';
            playSound('countdownSound'); // Play initial countdown sound

            const interval = setInterval(() => {
                count--;
                countdownTimerDisplay.textContent = count;
                
                if (count > 0) {
                    playSound('countdownSound'); // Play countdown sound on each tick
                } else {
                    clearInterval(interval);
                    countdownMessageDisplay.textContent = 'Sending...';
                    // Call the final submission function after countdown
                    submitEmergencyReport(formData);
                }
            }, 1000);
        }

        // 4. Main Form Submission Handler 
        reportForm?.addEventListener('submit', (e) => {
            e.preventDefault(); 

            // Basic Form Validation (check required fields)
            const incidentType = document.getElementById('incidentType').value;
            const description = document.getElementById('description').value;

            if (!currentLat || !currentLon) {
                showMessage('Please fetch your current location before submitting.', 'error', 5000);
                return;
            }

            if (!incidentType || incidentType === '') {
                showMessage('Please select an Incident Type.', 'error', 5000);
                return;
            }
            if (!description || description.trim() === '') {
                 showMessage('Please add a Description.', 'error', 5000);
                return;
            }

            // Temporarily disable the button to prevent multiple submissions
            submitBtn.disabled = true; 

            // Create FormData object to easily get all form values including file
            const formData = new FormData(reportForm);

            // Start the delayed submission (countdown)
            startCountdown(formData);
        });

        // 5. Close Success Modal
        closeSuccessBtn?.addEventListener('click', () => {
            successModal.classList.add('hidden');
            // Reset state
            reportForm.reset();
            locationInput.value = '';
            currentLat = null;
            currentLon = null;
            submitBtn.disabled = false; // Re-enable the submit button
        });
    }

}); // End of DOMContentLoaded