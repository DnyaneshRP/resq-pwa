// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => console.log("SW Registered"));
}

// Function to check login status and redirect if needed
function checkLoginStatus() {
    const isUserLoggedIn = localStorage.getItem('isLoggedIn');
    const currentPage = window.location.pathname;

    // If user is logged in AND on the login/register page, redirect to home
    if (isUserLoggedIn === 'true' && (currentPage.includes('index.html') || currentPage.includes('register.html') || currentPage === '/')) {
        window.location.href = "home.html";
    } 
    // If user is NOT logged in AND on the home page, redirect to login
    else if (isUserLoggedIn !== 'true' && currentPage.includes('home.html')) {
        window.location.href = "index.html";
    }
}

// Run the check on every page load
checkLoginStatus();


// Registration
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', e => {
    e.preventDefault();

    // Get all input/select elements by their IDs
    const user = {
      fullname: fullname.value,
      email: email.value,
      phone: phone.value,
      // Added DOB
      dob: dob.value,
      // No Age needed now (derived from DOB)
      gender: gender.value, // Now a select value
      bloodgrp: bloodgrp.value, // Now a select value
      address: address.value,
      city: city.value, // Now a select value
      pincode: pincode.value,
      emergency1: emergency1.value,
      emergency2: emergency2.value,
      medical: medical.value,
      password: password.value
    };

    localStorage.setItem('resqUser', JSON.stringify(user));
    alert("Registration Successful! Please login.");
    window.location.href = "index.html";
  });
}

// Login
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('resqUser'));
    const loginEmail = username.value; // Renamed for clarity
    const loginPassword = password.value;

    if (!user) return alert("No account found! Please register first.");

    // Login only with Email and Password
    if (loginEmail === user.email && loginPassword === user.password) {
      alert("Login successful!");
      // Set login flag in localStorage (Crucial for offline persistence)
      localStorage.setItem('isLoggedIn', 'true'); 
      window.location.href = "home.html";
    } else {
      alert("Invalid email or password!");
    }
  });
}