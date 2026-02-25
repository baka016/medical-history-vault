const API = "http://127.0.0.1:5000";

let isLogin = true;

/* ================= AUTH ================= */

function toggleMode() {
  isLogin = !isLogin;

  const title = document.querySelector("h2");
  const button = document.querySelector("button[type='submit']");
  const registerBtn = document.querySelector(".linkBtn");

  if (isLogin) {
    title.innerText = "Welcome back";
    button.innerText = "Sign In";
    registerBtn.innerText = "Register";
  } else {
    title.innerText = "Create Account";
    button.innerText = "Register";
    registerBtn.innerText = "Login";
  }
}

async function submitForm(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const endpoint = isLogin ? "/auth/login" : "/auth/register";

  const body = isLogin
    ? { email, password }
    : { name: "User", email, password };

  const res = await fetch(API + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (res.ok) {
    if (isLogin) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    } else {
      alert("Registered successfully! Now login.");
      toggleMode();
    }
  } else {
    document.getElementById("errorMessage").innerText =
      data.error || "Something went wrong";
  }
}

/* ================= DASHBOARD ================= */

async function loadDashboard() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  await loadRecords();
  await loadVisits();
}

/* ================= RECORDS ================= */

async function loadRecords(search = "") {
  const token = localStorage.getItem("token");

  let url = `${API}/records`;
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token }
  });

  const records = await res.json();

  document.getElementById("totalRecords").innerText = records.length;

  const container = document.getElementById("recordsContainer");
  container.innerHTML = "";

  records.forEach(record => {
    const div = document.createElement("div");
    div.className = "record-item";
    div.innerHTML = `
      <div class="record-title">${record.title}</div>
      <div class="record-category">${record.category}</div>
    `;
    container.appendChild(div);
  });
}

/* ================= SEARCH ================= */

function searchRecords() {
  const searchValue = document.getElementById("searchInput").value.trim();
  loadRecords(searchValue);
}

/* ================= UPLOAD ================= */

async function uploadRecord(event) {
  event.preventDefault();

  const token = localStorage.getItem("token");
  const fileInput = document.getElementById("fileInput");

  if (!fileInput.files.length) {
    alert("Please select a file");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  const res = await fetch(`${API}/records/upload`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token
    },
    body: formData
  });

  const data = await res.json();

  if (res.ok) {
    alert("Upload successful! Category: " + data.category);
    loadRecords();
  } else {
    alert(data.error || "Upload failed");
  }
}

/* ================= VISITS ================= */

async function loadVisits() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/visits`, {
    headers: { Authorization: "Bearer " + token }
  });

  const visits = await res.json();
  document.getElementById("totalVisits").innerText = visits.length;
}

/* ================= EXPORT ================= */

async function exportPDF() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/records/export`, {
    headers: { Authorization: "Bearer " + token }
  });

  if (!res.ok) {
    alert("Export failed");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medical_report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ================= LOGOUT ================= */

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

/* ================= AUTO LOAD ================= */

if (window.location.pathname.includes("dashboard.html")) {
  loadDashboard();
}