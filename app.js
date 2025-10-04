// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => console.log("SW Registered"));
}

// *** Data Reset & Initial Setup (RUN ONCE) ***
// To clear all previous registrations:
// localStorage.removeItem('resqUser'); 
// localStorage.removeItem('isLoggedIn'); 
// alert("All previous registration data cleared!"); // You can remove this line after testing

// --- CORE NAVIGATION/LOGIN LOGIC ---
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentPage = window.location.pathname;

    // Guaranteed Home Page Redirect (Auto-login)
    // If logged in AND on the login/register page, go to home
    if (isLoggedIn && (currentPage.includes('index.html') || currentPage.includes('register.html') || currentPage === '/')) {
        window.location.href = "home.html";
    } 
    
    // Navigation Restriction 
    // If NOT logged in AND on the home page, go to login
    else if (!isLoggedIn && currentPage.includes('home.html')) {
        window.location.href = "index.html";
    }
}
checkLoginStatus(); // Run the check on every page load


// --- Registration Logic (No Changes to data handling, just cleaner syntax) ---
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
    // 1. Menu Toggle Logic
    document.getElementById('menuButton').addEventListener('click', () => {
        document.getElementById('menuOptions').classList.toggle('active');
    });

    // 2. Logout Logic
    document.getElementById('logoutButton').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem('isLoggedIn', 'false'); // Unset login flag
        alert("Logged out successfully.");
        window.location.href = "index.html"; // Redirect to login page
    });
}