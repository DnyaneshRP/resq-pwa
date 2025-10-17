// --- Supabase SDK Imports ---
// We use the recommended CDN approach for simple PWA/Vanilla JS projects.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.3/+esm';

// =================================================================
// YOUR SUPABASE CONFIGURATION (REPLACE WITH YOUR KEYS)
// =================================================================
const SUPABASE_URL = 'https://ayptiehjxxincwsbtysl.supabase.co'; // e.g., https://[project-ref].supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cHRpZWhqeHhpbmN3c2J0eXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTY2NzIsImV4cCI6MjA3NjE3MjY3Mn0.jafnb-fxqWbZm7uJf2g17CgiGzS-MetDY1h0kV-d0vg'; // e.g., eyJ...
// =================================================================

// --- Initialize Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Supabase client gives us access to Auth and Database (Postgres)

// --- Global Utility: Custom Message Box (Unchanged) ---
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


// --- CORE NAVIGATION & AUTH STATE (Supabase Auth) ---
// Supabase uses 'onAuthStateChange' to listen for login/logout events.
supabase.auth.onAuthStateChange((event, session) => {
    // 'session' is null when logged out, and an object when logged in.
    const isLoggedIn = !!session;
    // user object from session.user, or null
    const user = session?.user || null;
    
    const currentPagePath = window.location.pathname.split('/').pop() || 'index.html';
    
    const protectedPages = ['home.html', 'profile.html', 'about.html']; 
    const loginPages = ['index.html', 'register.html'];

    if (isLoggedIn && loginPages.includes(currentPagePath)) {
        // Redirect logged-in user from login/register to home.
        window.location.replace('home.html'); 
    } 
    else if (!isLoggedIn && protectedPages.includes(currentPagePath)) {
        // Redirect logged-out user from protected pages to login.
        window.location.replace('index.html');
    }
    
    // If the user is logged in and on a protected page, update the drawer name.
    if (isLoggedIn && protectedPages.includes(currentPagePath)) {
        setDrawerHeaderName(user.id); // Supabase uses user.id for the unique ID
    }
});


// --- REGISTRATION LOGIC (Supabase Auth + Database) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            // Step 1: Create the user in Supabase Authentication.
            const { data, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            // Supabase Auth requires email confirmation by default. 
            // The data.user will be available, but might be unconfirmed.
            const user = data.user;
            if (!user) {
                // This typically happens if email confirmation is required but not yet done
                showMessage("Registration successful! Check your email to confirm your account, then log in.", 'success', 5000);
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 3000);
                return;
            }

            // Step 2: Create the profile data object from the form.
            const userProfileData = {
              id: user.id, // CRITICAL: Supabase user ID is mapped to the 'id' column in the profiles table
              fullname: document.getElementById('fullname').value,
              email: email,
              phone: document.getElementById('phone').value,
              dob: document.getElementById('dob').value,
              gender: document.getElementById('gender').value,
              bloodgrp: document.getElementById('bloodgrp').value,
              address: document.getElementById('address').value,
              city: document.getElementById('city').value,
              pincode: document.getElementById('pincode').value,
              emergency1: document.getElementById('emergency1').value,
              emergency2: document.getElementById('emergency2').value,
              medical: document.getElementById('medical').value
            };

            // Step 3: Save this profile data to the 'profiles' table in the database.
            const { error: dbError } = await supabase
                .from('profiles') // The table name we created
                .insert([userProfileData]);

            if (dbError) throw dbError;

            showMessage("Registration successful and profile saved!", 'success');
            setTimeout(() => {
                // If email confirmation is NOT required, the user is automatically logged in.
                // If it IS required, the onAuthStateChange listener will handle the redirect 
                // after the user confirms their email and tries to log in.
                window.location.href = "index.html";
            }, 1500);

        } catch (error) {
            console.error("Registration Error:", error);
            // Supabase errors are often full objects, so we check for the message.
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
            // Step 1: Sign the user in using Supabase.
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error;

            showMessage("Login successful!", 'success');
            // onAuthStateChange handles the redirect to home.html.

        } catch (error) {
            console.error("Login Error:", error);
            showMessage("Login Failed: Invalid credentials or unconfirmed email.", 'error');
        }
    });
}


// --- PROFILE PAGE LOGIC (Read from Supabase Database) ---
const profileDetails = document.getElementById('profileDetails');
if (profileDetails) {
    // The previous onAuthStateChanged is now inside the supabase.auth.onAuthStateChange listener.
    // We check the session synchronously or wait for the listener to fire.
    // For profile, we can use a direct call to get the current session.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            fetchUserProfile(session.user.id);
        } else {
            // Should not happen due to the navigation guard, but for safety:
            profileDetails.innerHTML = "<p>Please log in to view your profile.</p>";
        }
    });
}

async function fetchUserProfile(userId) {
    // Select all columns from the 'profiles' table where the id matches the logged-in user's ID.
    const { data: userProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId) // RLS ensures this only returns the *current* user's profile anyway
        .single(); // Expect only one user profile

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
    // ... (This function remains unchanged as it only deals with DOM manipulation)
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

    // Fetch the user's profile to get their name.
    const { data, error } = await supabase
        .from('profiles')
        .select('fullname')
        .eq('id', userId)
        .single();
        
    if (error && error.code !== 'PGRST116') {
         console.error("Drawer Name Fetch Error:", error);
         drawerTitleElement.textContent = `Hi User!`;
         return;
    }
    
    if (data && data.fullname) {
        const firstName = data.fullname.split(' ')[0];
        drawerTitleElement.textContent = `Hi ${firstName}!`;
    } else {
         drawerTitleElement.textContent = `Hi ResQ User!`;
    }
}

if (menuButton) {
    // Drawer functionality (Unchanged)
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
            // Step 1: Sign the user out of their Supabase session.
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            showMessage("Logged out successfully.", 'success');
            // onAuthStateChange handles the redirect to index.html.

        } catch (error) {
            console.error("Logout Error:", error);
            showMessage("Logout failed. Please try again.", 'error');
        }
    });
}


// --- Helper Functions (Date input, PWA Install Prompt) ---
// ... (The rest of the file remains unchanged)

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

// Minimal CSS to make the modal function on the login/register pages
// Since style.css isn't fully provided, here is the necessary structure for the PWA modal:
if (document.head.querySelector('link[href="style.css"]')) {
    // Wait for the main CSS to load for best styling, or include these minimal styles.
    // For a robust solution, you should place the styling in your style.css.
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .pwa-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 5000;
        }
        .pwa-modal-content {
            background: white; padding: 30px; border-radius: 12px; max-width: 90%; text-align: center;
        }
        .pwa-icon { color: #d32f2f; font-size: 3em; margin-bottom: 10px; }
        .pwa-install-btn, .pwa-dismiss-btn { width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; font-weight: bold; }
        .pwa-install-btn { background-color: #d32f2f; color: white; border: none; }
        .pwa-dismiss-btn { background-color: #ccc; color: #333; border: none; }
    `;
    document.head.appendChild(modalStyle);
}