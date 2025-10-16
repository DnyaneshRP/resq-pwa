// --- Firebase SDK Imports ---
// These lines import the necessary functions from the Firebase SDK.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// =================================================================
// YOUR FIREBASE CONFIGURATION (ALREADY PASTED IN)
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCQg7G0bhU6w65nPhxnr_DjnSpmJY55Iww",
  authDomain: "resq-pwa-backend.firebaseapp.com",
  projectId: "resq-pwa-backend",
  storageBucket: "resq-pwa-backend.appspot.com",
  messagingSenderId: "615234174517",
  appId: "1:615234174517:web:76523a6e0d6d0feb813b7c"
};
// =================================================================

// --- Initialize Firebase Services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global Utility: Custom Message Box ---
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

// --- CORE NAVIGATION & AUTH STATE ---
// This function runs automatically whenever a user logs in or out.
onAuthStateChanged(auth, user => {
    const isLoggedIn = !!user; // true if a user object exists, false otherwise
    const currentPagePath = window.location.pathname.split('/').pop() || 'index.html';
    
    const protectedPages = ['home.html', 'profile.html', 'about.html']; 
    const loginPages = ['index.html', 'register.html'];

    if (isLoggedIn && loginPages.includes(currentPagePath)) {
        // If a logged-in user tries to access a login page, redirect them to home.
        window.location.replace('home.html'); // Use replace to prevent back navigation
    } 
    else if (!isLoggedIn && protectedPages.includes(currentPagePath)) {
        // If a logged-out user tries to access a protected page, redirect them to the login page.
        window.location.replace('index.html');
    }
    
    // If the user is logged in and on a protected page, update the drawer name.
    if (isLoggedIn && protectedPages.includes(currentPagePath)) {
        setDrawerHeaderName(user.uid);
    }
});

// --- REGISTRATION LOGIC (Firebase Auth + Firestore) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            // Step 1: Create the user in Firebase Authentication.
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Step 2: Create the profile data object from the form.
            const userProfileData = {
              uid: user.uid, // Store the unique user ID from Firebase Auth
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

            // Step 3: Save this profile data to our Firestore database in a "users" collection.
            await setDoc(doc(db, "users", user.uid), userProfileData);

            showMessage("Registration successful! Please login.", 'success');
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);

        } catch (error) {
            console.error("Registration Error:", error);
            // Provide a user-friendly error message, e.g., "auth/email-already-in-use".
            showMessage(`Registration Failed: ${error.code}`, 'error');
        }
    });
}

// --- LOGIN LOGIC (Firebase Auth) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // This securely signs the user in using Firebase.
            await signInWithEmailAndPassword(auth, email, password);
            showMessage("Login successful!", 'success');
            // The onAuthStateChanged function above will automatically handle the redirect to home.html.
        } catch (error) {
            console.error("Login Error:", error);
            showMessage("Login Failed: Invalid email or password.", 'error');
        }
    });
}

// --- PROFILE PAGE LOGIC (Read from Firestore) ---
const profileDetails = document.getElementById('profileDetails');
if (profileDetails) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // If a user is logged in, fetch their specific document from the "users" collection in Firestore.
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // If the document exists, display the data using the renderProfile function.
                renderProfile(docSnap.data());
            } else {
                profileDetails.innerHTML = "<p>No profile data found. Please complete your registration.</p>";
            }
        }
    });
}

function renderProfile(user) {
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


// --- DRAWER & LOGOUT LOGIC (Firebase Auth) ---
const menuButton = document.getElementById('menuButton');
const sideDrawer = document.getElementById('sideDrawer');
const closeDrawer = document.getElementById('closeDrawer');
const logoutButton = document.getElementById('logoutButton');
const backdrop = document.getElementById('drawerBackdrop');

async function setDrawerHeaderName(uid) {
    const drawerTitleElement = document.getElementById('drawerTitle');
    if (!drawerTitleElement) return;

    // Fetch the user's profile from Firestore to get their name.
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const userData = docSnap.data();
        const firstName = userData.fullname.split(' ')[0];
        drawerTitleElement.textContent = `Hi ${firstName}!`;
    }
}

if (menuButton) {
    // This is your existing, working drawer logic.
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
            // This signs the user out of their Firebase session.
            await signOut(auth);
            showMessage("Logged out successfully.", 'success');
            // The onAuthStateChanged function will automatically handle the redirect to index.html.
        } catch (error) {
            showMessage("Logout failed. Please try again.", 'error');
        }
    });
}


// --- Helper Functions (Date input, PWA Install Prompt) ---
// These are unchanged and placed at the end for clarity.
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
        if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
        pwaModal.remove();
    });
    document.getElementById('dismissButton').addEventListener('click', () => { pwaModal.remove(); });
}