// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => console.log("SW Registered"));
}

// ===============================================
// PWA Installation Prompt Logic (NEW FEATURE)
// ===============================================
let deferredPrompt;

// 1. Listen for the native browser prompt (and prevent it from showing automatically)
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser UI from showing
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Show a custom UI to the user to let them know they can install
    showInstallPromotion(); 
});

// A simple function to display a subtle install message
function showInstallPromotion() {
    // Check if the banner already exists to prevent duplicates
    if (document.getElementById('pwaInstallBanner')) return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
        // Already installed, don't show the prompt
        return;
    }

    // --- Inject a temporary Install Banner into the DOM ---
    const banner = document.createElement('div');
    banner.id = "pwaInstallBanner";
    banner.innerHTML = `
        <div style="position:fixed; bottom:0; left:0; width:100%; padding:15px; background:#d32f2f; color:white; text-align:center; cursor:pointer; font-weight:600; z-index: 10000; box-shadow: 0 -2px 10px rgba(0,0,0,0.3);">
            Tap here to Install ResQ PWA for a full app experience!
        </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('pwaInstallBanner').addEventListener('click', () => {
        if (deferredPrompt) {
            // Show the deferred prompt
            deferredPrompt.prompt();
            // Hide the custom banner after showing the prompt
            document.getElementById('pwaInstallBanner').remove();
            deferredPrompt = null;
        }
    });
}


// --- Custom Message Box Function (Replaces alert()) ---
function showMessage(message, type = 'success', duration = 3000) {
    const messageBox = document.getElementById('customMessageBox');
    if (!messageBox) return;

    // Remove any previous classes and set content
    messageBox.className = `custom-message-box hidden ${type}`;
    messageBox.textContent = message;

    // Show the box with transition
    setTimeout(() => {
        messageBox.classList.remove('hidden');
        messageBox.classList.add('show');
    }, 10); // Small delay to allow transition

    // Hide the box after duration
    setTimeout(() => {
        messageBox.classList.remove('show');
        // Hide completely after transition
        setTimeout(() => {
             messageBox.classList.add('hidden');
        }, 300);
    }, duration);
}
// ----------------------------------------------------


// --- CRITICAL FIX: Date Input Visibility Logic ---
const dobInput = document.getElementById('dob');

if (dobInput) {
    dobInput.addEventListener('focus', () => {
        dobInput.type = 'date';
        dobInput.removeAttribute('placeholder');
    });

    dobInput.addEventListener('blur', () => {
        if (!dobInput.value) {
            dobInput.type = 'text';
            dobInput.setAttribute('placeholder', 'DD/MM/YYYY');
        }
    });
}
// ----------------------------------------------------


// --- CORE NAVIGATION/LOGIN LOGIC ---
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentPage = window.location.pathname;
    
    // Pages requiring login
    const protectedPages = ['home.html', 'profile.html']; 

    // Guaranteed Home Page Redirect (Auto-login)
    if (isLoggedIn && (currentPage.includes('index.html') || currentPage.includes('register.html') || currentPage === '/')) {
        // Use replaceState here too, to prevent going back to login screen after auto-redirect
        window.history.replaceState({}, document.title, "home.html");
        window.location.href = "home.html";
    } 
    
    // Navigation Restriction 
    else if (!isLoggedIn && protectedPages.some(page => currentPage.includes(page))) {
        window.location.href = "index.html";
    }
}
checkLoginStatus(); // Run the check on every page load


// --- Registration Logic ---
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', e => {
    e.preventDefault();

    const user = {
      fullname: document.getElementById('fullname').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      dob: document.getElementById('dob').value,
      gender: document.getElementById('gender').value,
      bloodgrp: document.getElementById('bloodgrp').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      pincode: document.getElementById('pincode').value,
      emergency1: document.getElementById('emergency1').value,
      emergency2: document.getElementById('emergency2').value,
      medical: document.getElementById('medical').value,
      password: document.getElementById('password').value
    };

    localStorage.setItem('resqUser', JSON.stringify(user));
    showMessage("Registration Successful! Please login.", 'success');
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1000);
  });
}

// --- Login Logic (Uses only Email) ---
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('resqUser'));
    const loginEmail = document.getElementById('username').value;
    const loginPassword = document.getElementById('password').value;

    if (!user) return showMessage("No account found! Please register first.", 'error');

    if (loginEmail === user.email && loginPassword === user.password) {
      showMessage("Login successful!", 'success');
      localStorage.setItem('isLoggedIn', 'true'); // Set login flag
      
      // CRITICAL FIX: Replace the current history entry so 'back' button exits the app
      window.history.replaceState({}, document.title, "home.html"); 
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1000);
      
    } else {
      showMessage("Invalid email or password!", 'error');
    }
  });
}

// --- Profile Page Logic: Load and Display User Data ---
if (document.getElementById('profileDetails')) {
    const detailsContainer = document.getElementById('profileDetails');
    const user = JSON.parse(localStorage.getItem('resqUser'));

    if (user) {
        detailsContainer.innerHTML = ''; 

        // List of fields to display, formatted nicely
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
            // Skip empty optional fields
            if (user[field.key]) {
                const item = document.createElement('div');
                item.classList.add('profile-item');
                item.innerHTML = `
                    <span class="profile-label">${field.label}:</span>
                    <span class="profile-value">${user[field.key]}</span>
                `;
                detailsContainer.appendChild(item);
            }
        });
    } else {
        detailsContainer.innerHTML = `<p>No user data found. Please <a href="register.html">register</a>.</p>`;
    }
}


// =======================================================
// Home/Profile Page Logic (Corrected Side Drawer Menu)
// =======================================================

const menuButton = document.getElementById('menuButton');
const sideDrawer = document.getElementById('sideDrawer');
const closeDrawer = document.getElementById('closeDrawer');
const logoutButton = document.getElementById('logoutButton');
const backdrop = document.getElementById('drawerBackdrop'); 

if (menuButton && sideDrawer) {

    // Main function to toggle the drawer state
    function toggleDrawer() {
        sideDrawer.classList.toggle('open');
        backdrop.classList.toggle('active');
        
        // Prevent body scrolling when the drawer is open
        document.body.style.overflowY = sideDrawer.classList.contains('open') ? 'hidden' : 'auto';
    }

    // Event listeners for opening and closing the drawer
    menuButton.addEventListener('click', toggleDrawer);
    closeDrawer.addEventListener('click', toggleDrawer);
    backdrop.addEventListener('click', toggleDrawer);

    // Logout Logic (Now inside the drawer's event listener block)
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn'); 
            showMessage("Logged out successfully.", 'success');
            
            // Close the drawer before redirecting for a cleaner transition
            if (sideDrawer.classList.contains('open')) {
                 toggleDrawer(); 
            }
            
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        });
    }
}