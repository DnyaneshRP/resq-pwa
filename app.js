// --- Supabase SDK Import ---
// We use the @supabase/supabase-js library from a CDN.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// =================================================================
// YOUR SUPABASE CONFIGURATION
// =================================================================
// IMPORTANT: These keys are pulled from your Supabase Project Dashboard
const SUPABASE_URL = "https://eluzuaqbuvnsrtqfjntj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdXp1YXFidXZuc3J0cWZqbnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODI5OTgsImV4cCI6MjA3NjE1ODk5OH0.J_qEz3mQZoXsZGSIkQ5UDq-bmgFCNh8MkrzoLg0-YtU";
// =================================================================

// --- Initialize Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Utility: Custom Message Box (Unchanged) ---
function showMessage(message, type = 'success') {
    const box = document.getElementById('customMessageBox');
    box.textContent = message;
    box.className = `custom-message-box ${type}`;
    box.classList.remove('hidden');
    setTimeout(() => {
        box.classList.add('hidden');
    }, 3000);
}

// --- Navigation Utilities (Unchanged) ---
function navigateTo(path) {
    window.location.href = path;
}

// --- Authentication State Management ---
// We use onAuthStateChange to monitor the user's login status in real-time.
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Supabase Auth Event:', event);
    const isAuthenticated = !!session;
    const isLoginOrRegister = window.location.pathname.includes('index.html') || window.location.pathname.includes('register.html');
    
    // Logic to redirect unauthenticated users away from protected pages
    if (isAuthenticated) {
        if (isLoginOrRegister) {
            navigateTo('home.html');
        }
    } else {
        if (!isLoginOrRegister) {
            // Only redirect if not already on the login page
            navigateTo('index.html');
        }
    }

    // Update drawer header with user email if available
    const drawerTitle = document.getElementById('drawerTitle');
    if (drawerTitle) {
        // Use optional chaining for safety
        drawerTitle.textContent = session?.user?.email || 'ResQ Menu';
    }
});


// =================================================================
// SUPABASE AUTHENTICATION FUNCTIONS
// =================================================================

/**
 * Handles user registration with Supabase Auth and saves profile data.
 * @param {Event} e The form submit event.
 */
async function handleRegistration(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    // Data to save to the 'profiles' table after successful auth
    const profileData = {
        full_name: form.fullname.value,
        phone_number: form.phone.value,
        dob: form.dob.value || null, // Supabase expects null for empty dates
        address: form.address.value,
        city: form.city.value,
        pincode: form.pincode.value,
        emergency_contact_1: form.emergency1.value,
        emergency_contact_2: form.emergency2.value,
        medical_conditions: form.medical.value,
    };

    try {
        // 1. Sign up the user (creates the user in auth.users)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;

        // 2. Insert profile data into the 'profiles' table
        // We use upsert here to handle cases where the RLS trigger might have already created a placeholder row.
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authData.user.id, // Link to the Auth user's ID
                ...profileData
            }, { 
                onConflict: 'id' // Conflict strategy is to update on matching ID
            });

        if (profileError) {
            console.error('Profile save error:', profileError.message);
            // This error should now be fixed by dropping the SQL trigger
            throw new Error("Registration succeeded but profile save failed. Please contact support.");
        }

        showMessage('Registration successful! Redirecting...', 'success');
        // Redirection handled by the onAuthStateChange listener
    } catch (error) {
        console.error('Registration failed:', error.message);
        showMessage(error.message, 'error');
    }
}

/**
 * Handles user login.
 * @param {Event} e The form submit event.
 */
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.username.value;
    const password = form.password.value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        
        showMessage('Login successful! Welcome back.', 'success');
        // Redirection handled by the onAuthStateChange listener
    } catch (error) {
        console.error('Login failed:', error.message);
        showMessage(error.message, 'error');
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        showMessage('You have been logged out.', 'success');
        // Redirection handled by the onAuthStateChange listener
    } catch (error) {
        console.error('Logout failed:', error.message);
        showMessage('Logout failed.', 'error');
    }
}


// =================================================================
// SUPABASE DATABASE FUNCTIONS (FOR PROFILE DATA)
// =================================================================

/**
 * Fetches the current user's profile data from the 'profiles' table.
 * @returns {Object|null} The profile object or null on error/no data.
 */
async function fetchUserProfile() {
    // Get the current user session (returns null if not logged in)
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        showMessage('User not authenticated.', 'error');
        return null;
    }

    try {
        // Query the 'profiles' table, secured by the RLS policy we set up.
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single(); 

        // PGRST116 is the error code for 'no rows found'
        if (error && error.code !== 'PGRST116') { 
            throw error;
        }

        // Return the data if found, otherwise null
        return data; 

    } catch (error) {
        console.error('Error fetching profile:', error.message);
        showMessage('Failed to load profile data.', 'error');
        return null;
    }
}

/**
 * Saves or updates the user's profile data.
 * @param {Object} formData The data to save.
 */
async function saveUserProfile(formData) {
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        showMessage('Authentication required to save data.', 'error');
        return false;
    }

    try {
        // Use upsert to insert a new row or update an existing one based on the primary key (id)
        const { error } = await supabase
            .from('profiles')
            .upsert({
                ...formData,
                id: user.id // Ensure the user ID is always included for security/linking
            }, { 
                onConflict: 'id' 
            });

        if (error) throw error;

        showMessage('Profile saved successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error saving profile:', error.message);
        showMessage('Failed to save profile data.', 'error');
        return false;
    }
}

// =================================================================
// DOM EVENT LISTENERS AND INITIALIZATION
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Register Form Listener ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
        // Special handler for DOB input to ensure mobile friendliness
        setupDOBInput(registerForm.dob);
    }

    // --- Login Form Listener ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // --- Logout Button Listener ---
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // --- Profile Page Initialization ---
    if (window.location.pathname.includes('profile.html')) {
        initializeProfilePage();
    }

    // --- Menu Drawer Logic ---
    const menuButton = document.getElementById('menuButton');
    const closeDrawer = document.getElementById('closeDrawer');
    const sideDrawer = document.getElementById('sideDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sideDrawer.classList.add('open');
            drawerBackdrop.classList.add('active');
        });
    }

    if (closeDrawer || drawerBackdrop) {
        const closeHandler = () => {
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('active');
        };
        if (closeDrawer) closeDrawer.addEventListener('click', closeHandler);
        if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeHandler);
    }

    // PWA Install Prompt Logic
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (localStorage.getItem('pwaPromptShown') !== 'true' && !window.matchMedia('(display-mode: standalone)').matches) {
            showInstallPromotionModal(); 
        }
    });
});

/**
 * Sets up the DOB input field to use the native date picker on focus.
 */
function setupDOBInput(dobInput) {
    if (!dobInput) return;
    dobInput.addEventListener('focus', () => {
        // Change type to 'date' only on focus to trigger the native date picker
        if (dobInput.type !== 'date') {
            dobInput.type = 'date';
        }
    });
}

// --- PWA Modal and Install Logic (Unchanged) ---
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
        if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
        pwaModal.remove();
    });
    document.getElementById('dismissButton').addEventListener('click', () => { pwaModal.remove(); });
}


// --- PROFILE PAGE SPECIFIC LOGIC ---
async function initializeProfilePage() {
    const profileForm = document.getElementById('profileForm');
    const profileData = await fetchUserProfile();
    
    if (profileData && profileForm) {
        // Populate the form fields with fetched data
        profileForm.fullname.value = profileData.full_name || '';
        profileForm.phone.value = profileData.phone_number || '';
        // Supabase date format (YYYY-MM-DD) works directly with input type="date"
        profileForm.dob.value = profileData.dob || ''; 
        profileForm.address.value = profileData.address || '';
        profileForm.city.value = profileData.city || '';
        profileForm.pincode.value = profileData.pincode || '';
        profileForm.emergency1.value = profileData.emergency_contact_1 || '';
        profileForm.emergency2.value = profileData.emergency_contact_2 || '';
        profileForm.medical.value = profileData.medical_conditions || '';
    }

    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
        // Ensure DOB input setup on the profile page as well
        setupDOBInput(profileForm.dob); 
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const form = e.target;
    
    // Collect data to be saved
    const formData = {
        full_name: form.fullname.value,
        phone_number: form.phone.value,
        dob: form.dob.value || null,
        address: form.address.value,
        city: form.city.value,
        pincode: form.pincode.value,
        emergency_contact_1: form.emergency1.value,
        emergency_contact_2: form.emergency2.value,
        medical_conditions: form.medical.value,
    };

    await saveUserProfile(formData);
}