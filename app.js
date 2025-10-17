// ===========================================================
//  RESQ PWA - Supabase Version (Authentication + Profiles)
// ===========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Supabase Project Config ---
const SUPABASE_URL = 'https://sletyixovbshfotyemly.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXR5aXhvdmJzaGZvdHllbWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTMyNDMsImV4cCI6MjA3NjE2OTI0M30.lb70Matfyr3pX9aXobRoozqVkOJL8b2G2Ao-cE8ESjA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ===========================================================
//  Message Popup
// ===========================================================
function showMessage(message, type = 'success', duration = 3000) {
  const messageBox = document.getElementById('customMessageBox')
  if (!messageBox) return
  messageBox.className = `custom-message-box hidden ${type}`
  messageBox.textContent = message
  setTimeout(() => {
    messageBox.classList.remove('hidden')
    messageBox.classList.add('show')
  }, 10)
  setTimeout(() => {
    messageBox.classList.remove('show')
    setTimeout(() => messageBox.classList.add('hidden'), 300)
  }, duration)
}

// ===========================================================
//  Register (Sign Up)
// ===========================================================
const registerForm = document.getElementById('registerForm')
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const fullname = document.getElementById('fullname').value
    const phone = document.getElementById('phone').value
    const dob = document.getElementById('dob').value
    const gender = document.getElementById('gender').value
    const bloodgrp = document.getElementById('bloodgrp').value
    const address = document.getElementById('address').value
    const city = document.getElementById('city').value
    const pincode = document.getElementById('pincode').value
    const emergency1 = document.getElementById('emergency1').value
    const emergency2 = document.getElementById('emergency2').value
    const medical = document.getElementById('medical').value

    // Step 1: Create Auth User
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) return showMessage(error.message, 'error')

    const user = data.user
    if (!user) return showMessage('Error: No user created.', 'error')

    // Step 2: Store Profile Info
    const { error: insertError } = await supabase.from('profiles').insert([
      {
        id: user.id,
        fullname,
        phone,
        dob,
        gender,
        bloodgrp,
        address,
        city,
        pincode,
        emergency1,
        emergency2,
        medical
      }
    ])

    if (insertError) return showMessage(insertError.message, 'error')

    showMessage('Registration successful! Please verify your email.', 'success')
    setTimeout(() => (window.location.href = 'index.html'), 2000)
  })
}

// ===========================================================
//  Login
// ===========================================================
const loginForm = document.getElementById('loginForm')
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('username').value
    const password = document.getElementById('password').value

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) showMessage(error.message, 'error')
    else {
      showMessage('Login successful!', 'success')
      setTimeout(() => (window.location.href = 'home.html'), 1500)
    }
  })
}

// ===========================================================
//  Auth Guard (Redirects based on login state)
// ===========================================================
async function checkAuth() {
  const {
    data: { session }
  } = await supabase.auth.getSession()
  const user = session?.user
  const currentPage = window.location.pathname.split('/').pop() || 'index.html'

  const protectedPages = ['home.html', 'profile.html', 'about.html']
  const loginPages = ['index.html', 'register.html']

  if (!user && protectedPages.includes(currentPage)) {
    window.location.href = 'index.html'
  } else if (user && loginPages.includes(currentPage)) {
    window.location.href = 'home.html'
  }
}
checkAuth()

// ===========================================================
//  Logout
// ===========================================================
const logoutButton = document.getElementById('logoutButton')
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut()
    showMessage('Logged out successfully.', 'success')
    setTimeout(() => (window.location.href = 'index.html'), 1500)
  })
}

// ===========================================================
//  Load Profile on Profile Page
// ===========================================================
async function loadProfile() {
  const {
    data: { session }
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Profile fetch error:', error)
    return
  }

  // Populate elements if exist
  const set = (id, val) => {
    const el = document.getElementById(id)
    if (el) el.textContent = val || '-'
  }

  set('profile-name', profile.fullname)
  set('profile-email', user.email)
  set('profile-phone', profile.phone)
  set('profile-city', profile.city)
  set('profile-blood', profile.bloodgrp)
}
window.loadProfile = loadProfile
