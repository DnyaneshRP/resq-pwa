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

// Helper to play sound (Assumes audio elements with these IDs exist in HTML)
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0; // Rewind to start
        // Using .play().catch is a standard way to handle autoplay restrictions
        audio.play().catch(e => console.log(`Audio play failed for ${id}:`, e));
    }
}


// --- CORE NAVIGATION, AUTH STATE, AND PROFILE INSERTER ---
supabase.auth.onAuthStateChange((event, session) => {
    const isLoggedIn = !!session;
    const user = session?.user || null;
    
    const currentPagePath = window.location.pathname.split('/').pop() || 'index.html';
    
    // ADDED history.html
    const protectedPages = ['home.html', 'report.html', 'profile.html', 'about.html', 'history.html']; 
    const loginPages = ['index.html', 'register.html'];

    if (isLoggedIn) {
        // If the user is authenticated, ensure their profile is in the database
        checkForMissingProfile(user); 

        if (loginPages.includes(currentPagePath)) {
            // Logged-in user accessing login/register page
            window.location.replace('home.html'); 
            return;
        }
    } 
    
    // Handle redirection for unauthenticated users
    if (!isLoggedIn && protectedPages.includes(currentPagePath)) {
        window.location.replace('index.html');
        return;
    }
    
    // Logic for Protected Pages
    if (isLoggedIn && protectedPages.includes(currentPagePath)) {
        setDrawerHeaderName(user.id); 
        
        // Fetch profile data only on the profile page
        if (currentPagePath === 'profile.html' && document.getElementById('profileDetails')) {
             fetchUserProfile(user.id);
        }
        
        // Automatically try to get location when report page loads
        if (currentPagePath === 'report.html' && document.getElementById('getLocationBtn')) {
            getGeolocation();
        }
        
        // Fetch report history on the history page
        if (currentPagePath === 'history.html' && document.getElementById('reportsHistoryContainer')) {
             fetchReportHistory(user.id);
        }
    }
});


// --- FUNCTION: Inserts profile data upon first successful sign-in/login ---
async function checkForMissingProfile(user) {
    const userId = user.id;
    const metadata = user.user_metadata;
    
    // Only proceed if we have metadata to insert (i.e., this user went through the registration form)
    if (!metadata || !metadata.fullname) return; 

    // 1. Check if profile already exists in the 'profiles' table
    const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

    if (profileCheck) {
        // Profile exists, no action needed
        return; 
    }

    // 2. Profile does NOT exist. Insert it using the data we stored in user_metadata.
    const userProfileData = {
        id: userId,
        fullname: metadata.fullname,
        email: user.email, // Use email from the main user object
        phone: metadata.phone,
        dob: metadata.dob,
        gender: metadata.gender,
        bloodgrp: metadata.bloodgrp,
        address: metadata.address,
        city: metadata.city,
        pincode: metadata.pincode,
        emergency1: metadata.emergency1,
        emergency2: metadata.emergency2,
        medical: metadata.medical // This is the correct field mapping from metadata
    };

    const { error: dbError } = await supabase
        .from('profiles')
        .insert([userProfileData]);

    if (dbError) {
         console.error("Profile Insertion Error:", dbError);
    } else {
         showMessage("User profile created in the database!", 'success');
    }
}


// --- REGISTRATION LOGIC (Supabase Auth + Metadata) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // **FIX IMPLEMENTATION:** Isolate the medical value to guarantee the source is correct
        const medicalValue = document.getElementById('medical').value;

        // Stage all form data for user_metadata
        const metadata = {
          fullname: document.getElementById('fullname').value,
          phone: document.getElementById('phone').value,
          dob: document.getElementById('dob').value,
          gender: document.getElementById('gender').value,
          bloodgrp: document.getElementById('bloodgrp').value,
          address: document.getElementById('address').value,
          city: document.getElementById('city').value,
          pincode: document.getElementById('pincode').value,
          emergency1: document.getElementById('emergency1').value,
          emergency2: document.getElementById('emergency2').value,
          // Use the isolated, confirmed medical value variable
          medical: medicalValue 
        };

        try {
            // Step 1: Create the user in Supabase Authentication and save metadata
            const { data, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: metadata // Store profile data securely in Auth metadata
                }
            });

            if (authError) throw authError;

            // Step 2: Handle post-signup state
            if (data.user) {
                // User auto-logged in. onAuthStateChange will handle profile insert and redirect.
                showMessage("Registration successful! Redirecting to home...", 'success');
            } else {
                 // Confirmation email sent. 
                showMessage("Registration successful! Check your email to confirm your account, then log in.", 'success', 5000);
                
                // FIX: Explicitly redirect to the login page (index.html)
                setTimeout(() => {
                    window.location.replace("index.html"); 
                }, 3000); // 3 seconds delay to read the message
            }

        } catch (error) {
            console.error("Registration Error:", error);
            showMessage(`Registration Failed: ${error.message || error.toString()}`, 'error');
        }
    });
}


// --- LOGIN LOGIC (Supabase Auth) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            // onAuthStateChange handles profile creation and redirect

            showMessage("Login successful!", 'success');

        } catch (error) {
            console.error("Login Error:", error);
            showMessage("Login Failed: Invalid credentials or unconfirmed email.", 'error');
        }
    });
}


// --- PROFILE PAGE LOGIC (Read from Supabase Database) ---
const profileDetails = document.getElementById('profileDetails');

async function fetchUserProfile(userId) {
    profileDetails.innerHTML = 'Loading user data...'; 
    
    // Fetch profile from the 'profiles' table
    const { data: userProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId) 
        .single(); 

    if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
        console.error("Profile Fetch Error:", error);
        profileDetails.innerHTML = "<p>Error loading profile data.</p>";
        return;
    }
    
    if (userProfiles) {
        renderProfile(userProfiles);
    } else {
        profileDetails.innerHTML = "<p>No profile data found. Please complete your registration.</p>";
    }
}


function renderProfile(user) {
    profileDetails.innerHTML = '';
    const fields = [
        { label: 'Full Name', key: 'fullname' },
        { label: 'Email', key: 'email' },
        { label: 'Phone Number', key: 'phone' },
        { label: 'Date of Birth', key: 'dob' },
        { label: 'Gender', key: 'gender' },
        { label: 'Blood Group', key: 'bloodgrp' },
        { label: 'Address', key: 'address' },
        { label: 'City', key: 'city' },
        { label: 'Pincode', key: 'pincode' },
        { label: 'Emergency Contact 1', key: 'emergency1' },
        { label: 'Emergency Contact 2', key: 'emergency2' },
        { label: 'Medical Conditions', key: 'medical' }
    ];
    fields.forEach(field => {
        if (user[field.key]) {
            const item = document.createElement('div');
            item.classList.add('profile-item');
            item.innerHTML = `
                <span class="profile-label">${field.label}:</span>
                <span class="profile-value">${user[field.key]}</span>
            `;
            profileDetails.appendChild(item);
        }
    });
}


// --- EMERGENCY REPORTING LOGIC ---

// Geolocation Functions
const getLocationBtn = document.getElementById('getLocationBtn');
const locationStatusInput = document.getElementById('locationStatus');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');

function getGeolocation() {
    if (!navigator.geolocation) {
        if(locationStatusInput) locationStatusInput.value = 'Geolocation not supported.';
        showMessage('Geolocation is not supported by your browser.', 'error');
        return;
    }

    if(locationStatusInput) locationStatusInput.value = 'Fetching location...';
    if(getLocationBtn) getLocationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            if(latitudeInput) latitudeInput.value = lat;
            if(longitudeInput) longitudeInput.value = lon;
            if(locationStatusInput) {
                locationStatusInput.value = `Location captured (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                locationStatusInput.style.backgroundColor = '#e8f5e9'; // Light green background
            }
            if(getLocationBtn) getLocationBtn.disabled = false;
            showMessage('Location captured successfully!', 'success');
        },
        (error) => {
            if(locationStatusInput) {
                locationStatusInput.value = 'Location failed.';
                locationStatusInput.style.backgroundColor = '#ffebee'; // Light red background
            }
            if(latitudeInput) latitudeInput.value = '';
            if(longitudeInput) longitudeInput.value = '';
            if(getLocationBtn) getLocationBtn.disabled = false;
            showMessage(`Error getting location: ${error.message}`, 'error', 5000);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // High accuracy settings
    );
}

if (getLocationBtn) {
    getLocationBtn.addEventListener('click', getGeolocation);
}

// Submission Logic
const emergencyReportForm = document.getElementById('emergencyReportForm');
const countdownModal = document.getElementById('countdownModal');
const successModal = document.getElementById('successModal');
const countdownTimer = document.getElementById('countdownTimer');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');

if (emergencyReportForm) {
    emergencyReportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic validation check
        if (!latitudeInput.value || !longitudeInput.value) {
            showMessage("Location is mandatory. Please click 'Get Location'.", 'error', 5000);
            return;
        }

        // Show confirmation and countdown
        await startCountdownAndSubmit();
    });
}

// FIX: REMOVED DELAY HERE (Point 2)
async function startCountdownAndSubmit() {
    // 1. Show Confirmation Modal
    if(countdownModal) countdownModal.classList.remove('hidden');
    let count = 3;
    if(countdownTimer) countdownTimer.textContent = count;

    // Play initial sound (Point 2)
    playSound('countdownSound'); 

    // 2. Start Countdown
    const countdownInterval = setInterval(() => {
        count--;
        if(countdownTimer) countdownTimer.textContent = count;
        
        // Play countdown sound on each tick (Point 2)
        if (count > 0) { // Play only on 3, 2, 1
           playSound('countdownSound'); 
        }

        if (count === 0) {
            clearInterval(countdownInterval);
            if(countdownModal) countdownModal.classList.add('hidden');
            
            // 3. Submit Report immediately after count reaches 0 (Point 2)
            submitEmergencyReport();
        }
    }, 1000);
}

async function submitEmergencyReport() {
    const description = document.getElementById('description').value;
    const incidentType = document.getElementById('incidentType').value;
    const incidentDetails = document.getElementById('incidentDetails').value; // NEW FIELD (Point 4)
    const severityLevel = document.getElementById('severityLevel').value; // NEW FIELD (Point 4)
    const photoFile = document.getElementById('photo').files[0];
    const latitude = parseFloat(latitudeInput.value);
    const longitude = parseFloat(longitudeInput.value);

    // Get the current user ID for linking the report
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showMessage('You must be logged in to report an emergency.', 'error');
        return;
    }

    let photoUrl = null;
    
    // Step A: Upload Photo (if present)
    if (photoFile) {
        try {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('emergency_photos') 
                .upload(fileName, photoFile);

            if (uploadError) throw uploadError;
            
            // Get public URL for the uploaded photo
            const { data: publicURLData } = supabase.storage
                .from('emergency_photos')
                .getPublicUrl(fileName);
            
            photoUrl = publicURLData.publicUrl;

        } catch (error) {
            console.error('Photo Upload Error:', error);
            showMessage('Photo upload failed. Submitting report without photo.', 'error', 5000);
            // Continue submission without photo
        }
    }

    // Step B: Submit Report Data to 'emergency_reports' table
    const reportData = {
        user_id: user.id,
        description: description,
        incident_type: incidentType,
        incident_details: incidentDetails, // NEW FIELD (Point 4)
        severity_level: severityLevel, // NEW FIELD (Point 4)
        latitude: latitude,
        longitude: longitude,
        photo_url: photoUrl, // Will be null if no photo or upload failed
        timestamp: new Date().toISOString(),
        status: 'Reported' // Default status for admin dashboard
    };

    try {
        const { error: insertError } = await supabase
            .from('emergency_reports') 
            .insert([reportData]);

        if (insertError) throw insertError;

        // Step C: Success
        if(successModal) successModal.classList.remove('hidden');
        playSound('successSound'); // Play success sound on popup (Point 2)
        
        emergencyReportForm.reset(); // Clear form
        if(locationStatusInput) locationStatusInput.value = 'Location Cleared.';
        if(latitudeInput) latitudeInput.value = '';
        if(longitudeInput) longitudeInput.value = '';

    } catch (error) {
        console.error('Report Submission Error:', error);
        showMessage(`Report Submission Failed: ${error.message}`, 'error', 6000);
    }
}

if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
        if(successModal) successModal.classList.add('hidden');
        window.location.replace('home.html'); // Redirect to home page
    });
}
// --- End of EMERGENCY REPORTING LOGIC ---


// --- NEW: REPORT HISTORY LOGIC (Point 3) ---
const reportsHistoryContainer = document.getElementById('reportsHistoryContainer');

async function fetchReportHistory(userId) {
    if(!reportsHistoryContainer) return;
    
    reportsHistoryContainer.innerHTML = '<p class="loading-state">Fetching your report history...</p>';

    const { data: reports, error } = await supabase
        .from('emergency_reports')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false }); // Show newest first

    if (error) {
        console.error("Report History Fetch Error:", error);
        reportsHistoryContainer.innerHTML = '<p class="error-state">Error loading report history. Please try again.</p>';
        return;
    }

    if (reports.length > 0) {
        renderReportHistory(reports);
    } else {
        reportsHistoryContainer.innerHTML = '<p class="empty-state">No past reports found. Stay safe!</p>';
    }
}

function renderReportHistory(reports) {
    reportsHistoryContainer.innerHTML = '';
    
    reports.forEach(report => {
        const reportDate = new Date(report.timestamp).toLocaleString();
        
        const card = document.createElement('div');
        card.classList.add('report-card-history'); // Use specific history class
        
        // Conditional photo display
        let photoHtml = report.photo_url ? `<img src="${report.photo_url}" alt="Incident Photo" class="report-photo">` : '';
        
        // Dynamically style status based on text
        const statusClass = `status-${report.status.toLowerCase().replace(/ /g, '_')}`;

        card.innerHTML = `
            ${photoHtml}
            <div class="report-header">
                <h4>${report.incident_type}</h4>
                <span class="report-status ${statusClass}">${report.status}</span>
            </div>
            
            <p class="report-detail-line"><strong>Severity:</strong> ${report.severity_level || 'N/A'}</p>
            <p class="report-detail-line"><strong>What happened:</strong> ${report.incident_details || 'No specific details provided.'}</p>
            <p class="report-description"><strong>Additional Context:</strong> ${report.description || 'N/A'}</p>

            <div class="report-footer">
                <span class="report-datetime"><i class="fas fa-clock"></i> Reported: ${reportDate}</span>
                <span class="report-location"><i class="fas fa-map-marker-alt"></i> Location: ${report.latitude ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` : 'N/A'}</span>
            </div>
        `;
        reportsHistoryContainer.appendChild(card);
    });
}
// --- END OF REPORT HISTORY LOGIC ---


// --- DRAWER & LOGOUT LOGIC (Supabase) ---
const menuButton = document.getElementById('menuButton');
const sideDrawer = document.getElementById('sideDrawer');
const closeDrawer = document.getElementById('closeDrawer');
const logoutButton = document.getElementById('logoutButton');
const backdrop = document.getElementById('drawerBackdrop');

async function setDrawerHeaderName(userId) {
    const drawerTitleElement = document.getElementById('drawerTitle');
    if (!drawerTitleElement) return;

    const { data } = await supabase
        .from('profiles')
        .select('fullname')
        .eq('id', userId)
        .single();
        
    if (data && data.fullname) {
        const firstName = data.fullname.split(' ')[0];
        drawerTitleElement.textContent = `Hi ${firstName}!`;
    } else {
         drawerTitleElement.textContent = `ResQ Menu`; 
    }
}

if (menuButton) {
    function toggleDrawer() {
        sideDrawer.classList.toggle('open');
        backdrop.classList.toggle('active');
        document.body.style.overflowY = sideDrawer.classList.contains('open') ? 'hidden' : 'auto';
    }
    menuButton.addEventListener('click', toggleDrawer);
    closeDrawer.addEventListener('click', toggleDrawer);
    backdrop.addEventListener('click', toggleDrawer);

    logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            showMessage("Logged out successfully.", 'success');

        } catch (error) {
            console.error("Logout Error:", error);
            showMessage("Logout failed. Please try again.", 'error');
        }
    });
}


// --- Helper Functions (Date input, PWA Install Prompt) ---
const dobInput = document.getElementById('dob');
if (dobInput) {
    dobInput.addEventListener('focus', () => { dobInput.type = 'date'; dobInput.removeAttribute('placeholder'); });
    dobInput.addEventListener('blur', () => { if (!dobInput.value) { dobInput.type = 'text'; dobInput.setAttribute('placeholder', 'DD/MM/YYYY'); } });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem('pwaPromptShown') !== 'true' && !window.matchMedia('(display-mode: standalone)').matches) {
        showInstallPromotionModal(); 
    }
});

function showInstallPromotionModal() {
    localStorage.setItem('pwaPromptShown', 'true');
    const modalHtml = `
        <div id="pwaModal" class="pwa-modal-overlay">
            <div class=\"pwa-modal-content\">
                <i class=\"fas fa-heartbeat pwa-icon\"></i>
                <h2>Install ResQ - Your Safety App</h2>
                <p>Install the ResQ app to get quick access to emergency features and use it even when you're offline. Get the full app experience!</p>
                <button id="installButton" class="pwa-install-btn">Install App Now</button>
                <button id="dismissButton" class="pwa-dismiss-btn">Not now, continue to website</button>
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