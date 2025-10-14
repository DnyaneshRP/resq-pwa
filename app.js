// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => console.log("SW Registered"));
}

// --- Global Utility: Get User Data ---
function getUserData() {
    try {
        const userJson = localStorage.getItem('resqUser');
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        console.error("Error retrieving user data:", e);
        return null;
    }
}

// --- Custom Message Box Function (Replaces alert()) ---
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
// ----------------------------------------------------

// --- Date Input Visibility Logic ---
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

// ===============================================
// CORE NAVIGATION/LOGIN LOGIC (FIXED)
// ===============================================
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentPagePath = window.location.pathname.split('/').pop(); // Gets 'index.html', 'home.html', etc.
    
    // Pages requiring login
    const protectedPages = ['home.html', 'profile.html', 'about.html']; 
    // Login pages
    const loginPages = ['index.html', 'register.html', '']; // '' handles root path

    // FIX 1: Prevent logged-in user from entering login/register pages
    if (isLoggedIn && loginPages.includes(currentPagePath)) {
        // Only redirect if not ALREADY on home.html (prevents refresh loop)
        if (currentPagePath !== 'home.html') {
            window.history.replaceState({}, document.title, "home.html");
            window.location.href = "home.html";
            return;
        }
    } 
    
    // FIX 2: Redirect non-logged-in user from protected pages
    else if (!isLoggedIn && protectedPages.includes(currentPagePath)) {
        window.history.replaceState({}, document.title, "index.html");
        window.location.href = "index.html";
        return;
    }
    
    // If logged in and on a protected page, initialize drawer name
    if (isLoggedIn && protectedPages.includes(currentPagePath)) {
        setDrawerHeaderName();
    }
}
// Ensure this runs immediately on script load
window.onload = checkLoginStatus; 


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

// --- Login Logic (Point 3: Improved Error Handling) ---
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = getUserData();
    const loginEmail = document.getElementById('username').value;
    const loginPassword = document.getElementById('password').value;

    if (!user) {
        return showMessage("Account not found. Please register first.", 'error');
    }

    if (loginEmail === user.email && loginPassword === user.password) {
      showMessage("Login successful!", 'success');
      localStorage.setItem('isLoggedIn', 'true'); 
      
      // CRITICAL: Prevent history back to login page
      window.history.replaceState({}, document.title, "home.html"); 
      setTimeout(() => {
        window.location.href = "home.html";
      }, 500); // Shorter delay for better UX
      
    } else {
      showMessage("Invalid email or password. Please try again.", 'error');
    }
  });
}

// --- Profile Page Logic: Load and Display User Data ---
if (document.getElementById('profileDetails')) {
    // Only run this code once the entire page structure is loaded
    document.addEventListener('DOMContentLoaded', () => {
        const detailsContainer = document.getElementById('profileDetails');
        const user = getUserData();

        if (user) {
            detailsContainer.innerHTML = ''; 

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
                    detailsContainer.appendChild(item);
                }
            });
            
        } else {
            detailsContainer.innerHTML = `<p>No user data found. Please <a href="register.html">register</a>.</p>`;
        }
    });
}


// =======================================================
// Drawer Menu Logic (FIXED JUMPING/JANKINESS)
// =======================================================

function setDrawerHeaderName() {
    const drawerTitleElement = document.getElementById('drawerTitle');
    const user = getUserData();

    if (drawerTitleElement && user && user.fullname) {
        const firstName = user.fullname.split(' ')[0];
        drawerTitleElement.textContent = `Hi ${firstName}!`;
    }
}

// Only run drawer logic if the elements exist (i.e., on protected pages)
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const sideDrawer = document.getElementById('sideDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const logoutButton = document.getElementById('logoutButton');
    const backdrop = document.getElementById('drawerBackdrop'); 

    if (!menuButton || !sideDrawer) return; // Exit if not a protected page

    setDrawerHeaderName(); // Set name when the DOM is ready

    function toggleDrawer() {
        // FIX: The drawer jump is often due to the scrollbar appearing/disappearing.
        // The CSS handles preventing y-scrolling on the body when open.
        sideDrawer.classList.toggle('open');
        backdrop.classList.toggle('active');
        document.body.style.overflowY = sideDrawer.classList.contains('open') ? 'hidden' : 'auto';
    }

    menuButton.addEventListener('click', toggleDrawer);
    closeDrawer.addEventListener('click', toggleDrawer);
    backdrop.addEventListener('click', toggleDrawer);

    // Logout Logic
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn'); 
            showMessage("Logged out successfully.", 'success');
            
            if (sideDrawer.classList.contains('open')) {
                 toggleDrawer(); 
            }
            
            setTimeout(() => {
                window.location.href = "index.html";
            }, 500); 
        });
    }
});

// ===============================================
// PWA Installation Prompt Logic (Full-Screen Modal)
// Re-added below to ensure it runs globally before DOMContentLoaded
// ===============================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Check if the user has already installed or dismissed the prompt
    if (localStorage.getItem('pwaPromptShown') !== 'true' && !window.matchMedia('(display-mode: standalone)').matches) {
        showInstallPromotionModal(); 
    }
});

function showInstallPromotionModal() {
    // Mark as shown so it doesn't appear again on next page load
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
            deferredPrompt = null;
        }
        pwaModal.remove();
    });

    document.getElementById('dismissButton').addEventListener('click', () => {
        pwaModal.remove();
    });
}