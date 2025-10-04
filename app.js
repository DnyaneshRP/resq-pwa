// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => console.log("SW Registered"));
}

// Registration
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', e => {
    e.preventDefault();

    const user = {
      fullname: fullname.value,
      email: email.value,
      phone: phone.value,
      age: age.value,
      gender: gender.value,
      bloodgrp: bloodgrp.value,
      address: address.value,
      city: city.value,
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

    if (!user) return alert("No account found! Please register first.");

    if ((username.value === user.email || username.value === user.fullname) &&
        password.value === user.password) {
      alert("Login successful!");
      window.location.href = "home.html";
    } else {
      alert("Invalid credentials!");
    }
  });
}

