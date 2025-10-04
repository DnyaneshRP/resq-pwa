// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => console.log("SW Registered"));
}

// NOTE: To clear old data for a fresh start (uncomment, run once, then comment again):
// localStorage.removeItem('resqUser'); 
// localStorage.removeItem('isLoggedIn'); 
// alert("All user data has been cleared!");


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
    alert("Registration Successful! Please login.");
    window.location.href = "index.html";
  });
}

// --- Login Logic (Uses only Email) ---
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('resqUser'));
    const loginEmail = document.getElementById('username').value;
    const loginPassword = document.getElementById('password').value;

    if (!user) return alert("No account found! Please register first.");

    if (loginEmail === user.email && loginPassword === user.password) {
      alert("Login successful!");
      localStorage.setItem('isLoggedIn', 'true'); // Set login flag
      
      // CRITICAL FIX: Replace the current history entry so 'back' button exits the app
      window.history.replaceState({}, document.title, "home.html"); 
      window.location.href = "home.html";
      
    } else {
      alert("Invalid email or password!");
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


// --- Home/Profile Page Logic (Logout & Menu) ---
if (document.getElementById('logoutButton')) {
    const menuButton = document.getElementById('menuButton');
    const menuOptions = document.getElementById('menuOptions');
    const logoutButton = document.getElementById('logoutButton');

    // 1. Menu Toggle Logic
    if (menuButton) {
      menuButton.addEventListener('click', () => {
          menuOptions.classList.toggle('active');
      });
      // This listener handles clicking outside the menu to close it
      document.body.addEventListener('click', (e) => {
          if (menuOptions.classList.contains('active') && !menuOptions.contains(e.target) && !menuButton.contains(e.target)) {
              menuOptions.classList.remove('active');
          }
      });
    }

    // 2. Logout Logic
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('isLoggedIn'); 
        alert("Logged out successfully.");
        window.location.href = "index.html";
    });
}