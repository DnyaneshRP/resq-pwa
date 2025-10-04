// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => console.log("SW Registered"));
}

// NOTE: To clear old data for a fresh start, uncomment and run these lines once:
// localStorage.removeItem('resqUser'); 
// localStorage.removeItem('isLoggedIn'); 
// alert("All user data has been cleared!");


// --- CORE NAVIGATION/LOGIN LOGIC ---
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentPage = window.location.pathname;

    // 1. Guaranteed Home Page Redirect (Auto-login / Offline persistence)
    // If logged in AND on the login/register page, go to home
    if (isLoggedIn && (currentPage.includes('index.html') || currentPage.includes('register.html') || currentPage === '/')) {
        window.location.href = "home.html";
    } 
    
    // 2. Navigation Restriction 
    // If NOT logged in AND on the home page, go to login
    else if (!isLoggedIn && currentPage.includes('home.html')) {
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
      window.location.href = "home.html";
    } else {
      alert("Invalid email or password!");
    }
  });
}

// --- Home Page Logic (Logout & Menu) ---
if (document.getElementById('logoutButton')) {
    const menuButton = document.getElementById('menuButton');
    const menuOptions = document.getElementById('menuOptions');
    const logoutButton = document.getElementById('logoutButton');

    // 1. Menu Toggle Logic
    if (menuButton) {
      menuButton.addEventListener('click', () => {
          menuOptions.classList.toggle('active');
      });
    }

    // 2. Logout Logic
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        // Clear login status and user data (optional, but good for security)
        localStorage.removeItem('isLoggedIn'); 
        // NOTE: We keep 'resqUser' so the user doesn't have to re-register
        alert("Logged out successfully.");
        window.location.href = "index.html"; // Redirect to login page
    });
}