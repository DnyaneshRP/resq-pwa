// --- Supabase SDK Import ---
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// =================================================================
// YOUR SUPABASE CONFIGURATION
// =================================================================
const SUPABASE_URL = "https://eluzuaqbuvnsrtqfjntj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdXp1YXFidXZuc3J0cWZqbnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODI5OTgsImV4cCI6MjA3NjE1ODk5OH0.J_qEz3mQZoXsZGSIkQ5UDq-bmgFCNh8MkrzoLg0-YtU";
// =================================================================

// --- Initialize Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Utility: Custom Message Box ---
function showMessage(message, type = 'success') {
    const box = document.getElementById('customMessageBox');
    if (!box) return;
    box.textContent = message;
    box.className = `custom-message-box ${type}`;
    box.classList.add('show');
    setTimeout(() => {
        box.classList.remove('show');
    }, 3000);
}

// --- Navigation ---
function navigateTo(path) {
    window.location.href = path;
}

// --- Authentication State Management & UI Updates ---
supabase.auth.onAuthStateChange(async (event, session) => {
    const isAuthenticated = !!session;
    const isPublicPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html');
    
    if (isAuthenticated) {
        if (isPublicPage) {
            navigateTo('home.html');
        }
        // Fetch profile to greet user by first name
        try {
            const { data: profile, error } = await supabase.from('profiles').select('full_name').single();
            if (error) throw error;
            const drawerTitle = document.getElementById('drawerTitle');
            if (drawerTitle && profile && profile.full_name) {
                const firstName = profile.full_name.split(' ')[0];
                drawerTitle.textContent = `Hi, ${firstName}`;
            }
        } catch (error) {
            console.error("Error fetching user's first name for greeting:", error);
        }

    } else {
        if (!isPublicPage) {
            navigateTo('index.html');
        }
    }
});

// =================================================================
// SUPABASE AUTHENTICATION & DATABASE FUNCTIONS
// =================================================================

async function handleRegistration(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const profileData = {
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

    try {
        const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        // After successful signup, insert the profile with the new user's ID
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: user.id, ...profileData });
            
        if (profileError) {
            // This is critical for debugging if it ever fails again
            console.error('CRITICAL: Profile insert failed after signup. Details:', profileError);
            throw new Error(`Profile save failed: ${profileError.message}`);
        }

        showMessage('Registration successful!', 'success');
        // The onAuthStateChange listener will handle the redirect
    } catch (error) {
        console.error('Registration process failed:', error);
        showMessage(error.message, 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = e.target.username.value;
    const password = e.target.password.value;
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // The onAuthStateChange listener will handle the redirect and success message is not needed
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle the redirect
}

// =================================================================
// PAGE-SPECIFIC LOGIC & DOM EVENT LISTENERS
// =================================================================

async function initializeProfilePage() {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('*').single();

        if (error) {
            // This handles the case where a user is logged in but has no profile row
            if (error.code === 'PGRST116') { 
                console.error("No profile found for this user.");
                showMessage("Could not find profile data.", "error");
            } else {
                throw error; // Other, more serious errors
            }
        }
        
        if (profile) {
            document.getElementById('display-fullname').textContent = profile.full_name || 'N/A';
            document.getElementById('display-phone').textContent = profile.phone_number || 'N/A';
            document.getElementById('display-dob').textContent = profile.dob || 'N/A';
            document.getElementById('display-address').textContent = profile.address || 'N/A';
            const cityPincode = [profile.city, profile.pincode].filter(Boolean).join(', ');
            document.getElementById('display-city-pincode').textContent = cityPincode || 'N/A';
            document.getElementById('display-emergency1').textContent = profile.emergency_contact_1 || 'N/A';
            document.getElementById('display-emergency2').textContent = profile.emergency_contact_2 || 'N/A';
            document.getElementById('display-medical').textContent = profile.medical_conditions || 'None specified';
        }
    } catch (error) {
        console.error("Error initializing profile page:", error);
        showMessage("Could not load profile data.", "error");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Form handlers
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegistration);

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // Page initializers
    if (window.location.pathname.includes('profile.html')) {
        initializeProfilePage();
    }

    // Drawer logic
    const menuButton = document.getElementById('menuButton');
    const closeDrawer = document.getElementById('closeDrawer');
    const sideDrawer = document.getElementById('sideDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const logoutButton = document.getElementById('logoutButton');

    const toggleDrawer = (open) => {
        sideDrawer.classList.toggle('open', open);
        drawerBackdrop.classList.toggle('active', open);
    };

    if (menuButton) menuButton.onclick = () => toggleDrawer(true);
    if (closeDrawer) closeDrawer.onclick = () => toggleDrawer(false);
    if (drawerBackdrop) drawerBackdrop.onclick = () => toggleDrawer(false);
    if(logoutButton) logoutButton.onclick = handleLogout;
});