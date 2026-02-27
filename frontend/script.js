const API = "http://127.0.0.1:5000";

let isLogin = true;
const reminders = [
  {
    title: "Annual eye exam with Dr. Wong",
    type: "Checkup",
    due: "2026-03-15"
  },
  {
    title: "Refill blood pressure medication",
    type: "Prescription Expiry",
    due: "2026-03-01"
  },
  {
    title: "Follow-up blood test for cholesterol",
    type: "Checkup",
    due: "2026-04-10"
  }
];

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

  attachSearchListeners();
  await loadRecords();
  await loadVisits();
  renderReminders();
}

/* ================= RECORDS ================= */

async function loadRecords(search = "") {
  const token = localStorage.getItem("token");
  const category = document.getElementById("categorySelect")?.value || "All";

  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category && category !== "All") params.append("category", category);

  const url = `${API}/records${params.toString() ? "?" + params.toString() : ""}`;

  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) {
    console.error("Failed to load records");
    return;
  }

  const records = await res.json();
  document.getElementById("totalRecords").innerText = records.length;
  document.getElementById("recordsCountLabel").innerText = `${records.length} record${records.length === 1 ? "" : "s"}`;

  renderRecords(records);
}

/* ================= SEARCH ================= */

function searchRecords() {
  const searchValue = document.getElementById("searchInput").value.trim();
  loadRecords(searchValue);
}

function clearFilters() {
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categorySelect");
  if (searchInput) searchInput.value = "";
  if (categorySelect) categorySelect.value = "All";
  loadRecords();
}

function attachSearchListeners() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchRecords();
      }
    });
    searchInput.dataset.bound = "true";
  }
}

/* ================= UPLOAD ================= */

async function uploadRecord(event) {
  if (event) event.preventDefault();

  const token = localStorage.getItem("token");
  const fileInput = document.getElementById("fileInput");
  const messageEl = document.getElementById("message");
  const titleInput = document.getElementById("titleInput");
  const categorySelect = document.getElementById("uploadCategory");
  const uploadDate = document.getElementById("uploadDate");

  if (!fileInput.files.length) {
    alert("Please select a file");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  if (titleInput?.value) formData.append("title", titleInput.value);
  if (categorySelect?.value) formData.append("category", categorySelect.value);
  if (uploadDate?.value) formData.append("upload_date", uploadDate.value);

  if (messageEl) messageEl.textContent = "Uploading...";

  const res = await fetch(`${API}/records/upload`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token
    },
    body: formData
  });

  const data = await res.json();

  if (res.ok) {
    if (messageEl) {
      messageEl.textContent = `Upload successful! Category: ${data.category}`;
    } else {
      alert("Upload successful! Category: " + data.category);
    }
    fileInput.value = "";
    if (titleInput) titleInput.value = "";
    if (uploadDate) uploadDate.value = "";
    loadRecords();
  } else {
    if (messageEl) {
      messageEl.textContent = data.error || "Upload failed";
    } else {
      alert(data.error || "Upload failed");
    }
  }
}

/* ================= VISITS ================= */

async function loadVisits() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/visits`, {
    headers: { Authorization: "Bearer " + token }
  });

  if (!res.ok) {
    console.error("Failed to load visits");
    return;
  }

  const visits = await res.json();
  document.getElementById("totalVisits").innerText = visits.length;

  const tbody = document.getElementById("visitTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    visits.forEach(visit => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(visit.visit_date)}</td>
        <td>${visit.doctor_name || "—"}</td>
        <td>${visit.condition_name || "—"}</td>
        <td><a href="#" aria-label="view">View</a></td>
      `;
      tbody.appendChild(tr);
    });
  }
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

/* ================= HELPERS ================= */
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function getCategoryClass(category = "") {
  const key = category.toLowerCase();
  if (key.includes("lab")) return "lab";
  if (key.includes("prescription")) return "prescription";
  if (key.includes("dental")) return "dental";
  if (key.includes("vaccination") || key.includes("vaccine")) return "vaccination";
  return "general";
}

function renderRecords(records) {
  const container = document.getElementById("recordsContainer");
  container.innerHTML = "";

  records.forEach((record, idx) => {
    const card = document.createElement("div");
    card.className = "record-card";

    const categoryClass = getCategoryClass(record.category);

    card.innerHTML = `
      <div class="record-thumb">🗎</div>
      <div>
        <div class="record-title">${record.title || "Untitled"}</div>
        <div class="record-date">${formatDate(record.upload_date)}</div>
        <div class="pill ${categoryClass}">${record.category || "General"}</div>
        <div class="pill general">AI Detected</div>
        <div class="extracted-text" id="text-${idx}" style="display:none;">${record.extracted_text || "No extracted text available."}</div>
      </div>
      <div class="record-actions">
        <span class="toggle-link" onclick="toggleText(${idx})">Show extracted text</span>
      </div>
    `;

    container.appendChild(card);
  });
}

function toggleText(idx) {
  const textEl = document.getElementById(`text-${idx}`);
  const link = textEl?.parentElement?.querySelector(".toggle-link");
  if (!textEl || !link) return;
  const isHidden = textEl.style.display === "none";
  textEl.style.display = isHidden ? "block" : "none";
  link.textContent = isHidden ? "Hide extracted text" : "Show extracted text";
}

/* ================= REMINDERS ================= */
function renderReminders() {
  const list = document.getElementById("remindersList");
  if (!list) return;
  list.innerHTML = "";

  reminders.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "reminder-item";
    div.innerHTML = `
      <div>
        <div class="reminder-title">${item.title}</div>
        <div class="reminder-meta">${item.type} · ${formatDate(item.due)}</div>
      </div>
      <button class="ghost" onclick="markReminderDone(${index})">Mark Done</button>
    `;
    list.appendChild(div);
  });

  document.getElementById("totalReminders").innerText = reminders.length;
}

function markReminderDone(index) {
  reminders.splice(index, 1);
  renderReminders();
}

/* ================= EXPORT FORM ================= */
function handleExport(event) {
  event.preventDefault();
  exportPDF();
}
