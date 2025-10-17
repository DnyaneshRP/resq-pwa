import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://sletyixovbshfotyemly.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXR5aXhvdmJzaGZvdHllbWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTMyNDMsImV4cCI6MjA3NjE2OTI0M30.lb70Matfyr3pX9aXobRoozqVkOJL8b2G2Ao-cE8ESjA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const showMessage = (msg, error = false) => {
  const box = document.getElementById("customMessageBox");
  box.textContent = msg;
  box.classList.add("show");
  box.classList.toggle("error", error);
  setTimeout(() => box.classList.remove("show"), 2500);
};

// REGISTER
const registerBtn = document.getElementById("registerButton");
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const dob = document.getElementById("dob").value;
    const gender = document.getElementById("gender").value;
    const blood_group = document.getElementById("blood_group").value;
    const address = document.getElementById("address").value;
    const city = document.getElementById("city").value;
    const pincode = document.getElementById("pincode").value;
    const emergency_contact1 = document.getElementById("emergency_contact1").value;
    const emergency_contact2 = document.getElementById("emergency_contact2").value;
    const medical_info = document.getElementById("medical_info").value;

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return showMessage(error.message, true);

    await supabase.from("profiles").insert({
      id: data.user.id,
      name,
      email,
      phone,
      dob: dob || null,
      gender,
      blood_group,
      address,
      city,
      pincode,
      emergency_contact1,
      emergency_contact2,
      medical_info,
    });

    showMessage("Registration successful!");
    setTimeout(() => (window.location = "index.html"), 1500);
  });
}

// LOGIN
const loginBtn = document.getElementById("loginButton");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return showMessage(error.message, true);
    showMessage("Login successful!");
    setTimeout(() => (window.location = "profile.html"), 1500);
  });
}

// LOAD PROFILE
window.loadProfile = async function () {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location = "index.html";
    return;
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) return showMessage("Profile not found", true);

  const fields = [
    "name", "email", "phone", "dob", "gender",
    "blood_group", "address", "city", "pincode",
    "emergency_contact1", "emergency_contact2", "medical_info"
  ];
  fields.forEach(f => {
    const el = document.getElementById(`profile-${f.replace("_", "")}`);
    if (el) el.textContent = data[f] || "-";
  });
};

// LOGOUT
const logoutBtn = document.getElementById("logoutButton");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location = "index.html";
  });
}

// DRAWER TOGGLE
const openDrawer = document.getElementById("openDrawer");
const closeDrawer = document.getElementById("closeDrawer");
const drawer = document.getElementById("drawer");

if (openDrawer && drawer && closeDrawer) {
  openDrawer.addEventListener("click", () => drawer.classList.add("show"));
  closeDrawer.addEventListener("click", () => drawer.classList.remove("show"));
}
