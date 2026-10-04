"use strict";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function api(url, options = {}) {
    const response = await fetch(url, options);

    if (response.status === 401) {
        window.location.href = "login.html";
        throw new Error("Unauthorized");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

async function loadProfile() {
    const data = await api("/api/admin/profile");
    document.getElementById("adminName").textContent = data.name;
    document.getElementById("adminEmail").textContent = data.email;
}

async function loadDashboard() {
    const data = await api("/api/admin/dashboard");

    Object.entries(data).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) element.textContent = value;
    });
}

async function loadReviews() {
    const box = document.getElementById("reviews");
    const reviews = await api("/api/admin/reviews");

    if (!reviews.length) {
        box.innerHTML = "<p>No customer reviews yet.</p>";
        return;
    }

    box.innerHTML = reviews.map(review => `
        <article class="admin-review">
            <div class="review-heading">
                <div>
                    <strong>${escapeHtml(review.name)}</strong>
                    <small>${escapeHtml(review.vehicle || "Vehicle")} • ${escapeHtml(review.service || "Service")} • ${escapeHtml(review.created_at)}</small>
                </div>
                <span class="admin-stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
            </div>
            <p>${escapeHtml(review.review)}</p>
            <div class="review-actions">
                <span class="status-badge ${escapeHtml(review.status)}">${escapeHtml(review.status)}</span>
                <button type="button" onclick="setReviewStatus(${review.id}, 'approved')">Approve</button>
                <button type="button" class="reject" onclick="setReviewStatus(${review.id}, 'rejected')">Reject</button>
                ${review.status !== "pending" ? `<button type="button" class="secondary" onclick="setReviewStatus(${review.id}, 'pending')">Pending</button>` : ""}
            </div>
        </article>
    `).join("");
}

async function setReviewStatus(id, status) {
    try {
        await api(`/api/admin/reviews/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        await Promise.all([loadDashboard(), loadReviews()]);
    } catch (error) {
        alert(error.message);
    }
}

async function loadAppointments() {
    const tbody = document.getElementById("appointmentsTable");
    const appointments = await api("/api/admin/appointments");

    if (!appointments.length) {
        tbody.innerHTML = '<tr><td colspan="7">No appointments yet.</td></tr>';
        return;
    }

    tbody.innerHTML = appointments.map(item => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.phone)}</td>
            <td>${escapeHtml(item.vehicle_type || "")} ${escapeHtml(item.vehicle_model || "")}</td>
            <td>${escapeHtml(item.service)}</td>
            <td>${escapeHtml(item.date)}</td>
            <td>${escapeHtml(item.problem || "-")}</td>
            <td>
                <select onchange="setAppointmentStatus(${item.id}, this.value)">
                    ${["pending", "confirmed", "completed", "cancelled"].map(status =>
                        `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`
                    ).join("")}
                </select>
            </td>
        </tr>
    `).join("");
}

async function setAppointmentStatus(id, status) {
    try {
        await api(`/api/admin/appointments/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        await loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

async function loadMessages() {
    const tbody = document.getElementById("messagesTable");
    const messages = await api("/api/admin/messages");

    if (!messages.length) {
        tbody.innerHTML = '<tr><td colspan="5">No messages yet.</td></tr>';
        return;
    }

    tbody.innerHTML = messages.map(item => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.email || "-")}</td>
            <td>${escapeHtml(item.message)}</td>
            <td>
                <select onchange="setMessageStatus(${item.id}, this.value)">
                    <option value="unread" ${item.status === "unread" ? "selected" : ""}>unread</option>
                    <option value="read" ${item.status === "read" ? "selected" : ""}>read</option>
                </select>
            </td>
            <td>${escapeHtml(item.created_at)}</td>
        </tr>
    `).join("");
}

async function setMessageStatus(id, status) {
    try {
        await api(`/api/admin/messages/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        await loadMessages();
        await loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

async function refreshAll() {
    try {
        await Promise.all([
            loadProfile(),
            loadDashboard(),
            loadReviews(),
            loadAppointments(),
            loadMessages()
        ]);
    } catch (error) {
        if (error.message !== "Unauthorized") {
            alert(error.message);
        }
    }
}

document.getElementById("refreshBtn")?.addEventListener("click", refreshAll);

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
        await api("/api/admin/logout", { method: "POST" });
    } finally {
        window.location.href = "login.html";
    }
});

refreshAll();
