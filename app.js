// --- Supabase SDK Imports ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.3/+esm';

// =================================================================
// YOUR SUPABASE CONFIGURATION (REPLACE WITH YOUR KEYS)
// =================================================================
const SUPABASE_URL = 'https://ayptiehjxxincwsbtysl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cHRpZWhqeHhpbmN3c2J0eXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTY2NzIsImV4cCI6MjA3NjE3MjY3Mn0.jafnb-fxqWbZm7uJf2g17CgiGzS-MetDY1h0kV-d0vg'; 
// =================================================================

// --- Initialize Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Utility: Custom Message Box ---
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


// --- CORE NAVIGATION, AUTH STATE, AND PROFILE INSERTER ---
supabase.auth.onAuthStateChange((event, session) => {
    const isLoggedIn = !!session;
    const user = session?.user || null;
    
    const currentPagePath = window.location.pathname.split('/').pop() || 'index.html';
    
    const protectedPages = ['home.html', 'profile.html', 'about.html']; 
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
    }
});


// --- FUNCTION: Inserts profile data upon first successful sign-in/login ---
async function checkForMissingProfile(user) {
    const userId = user.id;
    const metadata = user.user_metadata;
    
    // Only proceed if we have metadata to insert
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
        medical: metadata.medical
    };

    const { error: dbError } = await supabase
        .from('profiles')
        .insert([userProfileData]);

    if (dbError) {
         console.error("Profile Insertion Error:", dbError);
         // Do not show an error to the user if it's transient, but log it.
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
          // FIX: Ensure 'medical' is sourced from the correct input field ID
          medical: document.getElementById('medical').value 
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
                showMessage("Registration successful! Check your email to confirm your account.", 'success', 5000);
                
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
            <div class="pwa-modal-content">
                <i class="fas fa-heartbeat pwa-icon"></i>
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