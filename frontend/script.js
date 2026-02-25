const API = "http://127.0.0.1:5000";

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password})
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "dashboard.html";
    } else {
        document.getElementById("message").innerText = data.error;
    }
}

async function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            name: "User",
            email,
            password
        })
    });

    const data = await res.json();
    document.getElementById("message").innerText = data.message || data.error;
}

function goToUpload() {
    window.location.href = "upload.html";
}

async function viewRecords() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API}/records/my-records`, {
        headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();

    let html = `<h3>📂 My Medical Records</h3>`;

    if (data.length === 0) {
        html += `<p>No records found.</p>`;
    } else {
        data.forEach(record => {
            html += `
            <div class="card">
                <h4>${record.title}</h4>
                <p><strong>Category:</strong> ${record.category}</p>
                <p><strong>Uploaded:</strong> ${new Date(record.upload_date).toLocaleDateString()}</p>
                <button onclick="preview('${record.image_path}')">Preview</button>
            </div>`;
        });
    }

    document.getElementById("output").innerHTML = html;
}

async function emergency() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API}/records/emergency-summary`, {
        headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();

    let html = `<h3 style="color:red;">🆘 Emergency Summary</h3>`;

    if (data.last_visit) {
        html += `
        <div class="card">
            <h4>Last Visit</h4>
            <p><strong>Doctor:</strong> ${data.last_visit.doctor_name}</p>
            <p><strong>Condition:</strong> ${data.last_visit.condition_name}</p>
            <p><strong>Date:</strong> ${new Date(data.last_visit.visit_date).toLocaleDateString()}</p>
        </div>`;
    }

    if (data.latest_lab_report) {
        html += `
        <div class="card">
            <h4>Latest Lab Report</h4>
            <p><strong>File:</strong> ${data.latest_lab_report.title}</p>
            <p><strong>Date:</strong> ${new Date(data.latest_lab_report.upload_date).toLocaleDateString()}</p>
        </div>`;
    }

    if (data.latest_prescription) {
        html += `
        <div class="card">
            <h4>Latest Prescription</h4>
            <p><strong>File:</strong> ${data.latest_prescription.title}</p>
            <p><strong>Date:</strong> ${new Date(data.latest_prescription.upload_date).toLocaleDateString()}</p>
        </div>`;
    } else {
        html += `
        <div class="card">
            <h4>Latest Prescription</h4>
            <p>No prescription found</p>
        </div>`;
    }

    document.getElementById("output").innerHTML = html;
}

function exportPDF() {
    const token = localStorage.getItem("token");

    fetch(`${API}/records/export`, {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "medical_report.pdf";
        a.click();
    });
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

if (window.location.pathname.includes("dashboard.html")) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
    }
}

async function search() {
    const token = localStorage.getItem("token");
    const query = document.getElementById("searchInput").value;

    const res = await fetch(`${API}/records/search?q=${query}`, {
        headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();

    let html = `<h3>🔍 Search Results</h3>`;

    if (data.length === 0) {
        html += `<p>No results found.</p>`;
    } else {
        data.forEach(item => {
            html += `
            <div class="card">
                <p><strong>Type:</strong> ${item.type}</p>
                <p><strong>Main:</strong> ${item.main}</p>
                <p><strong>Extra:</strong> ${item.extra}</p>
                <p><strong>Date:</strong> ${new Date(item.date).toLocaleDateString()}</p>
            </div>`;
        });
    }

    document.getElementById("output").innerHTML = html;
}

function preview(filename) {
    const imageUrl = `${API}/uploads/${filename}`;
    window.open(imageUrl, "_blank");
}