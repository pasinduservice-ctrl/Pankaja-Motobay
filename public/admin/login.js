const form = document.getElementById("loginForm");
const errorBox = document.getElementById("error");
const submitButton = form?.querySelector("button[type='submit']");

form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (errorBox) errorBox.textContent = "";

    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";

    if (!email || !password) {
        if (errorBox) errorBox.textContent = "Enter your admin email and password.";
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Signing in...";
    }

    try {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "Login failed. Please check your details.");
        }

        window.location.replace("/admin/dashboard.html");
    } catch (error) {
        if (errorBox) {
            errorBox.textContent =
                error.message || "Could not connect to the server.";
        }
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Login";
        }
    }
});
