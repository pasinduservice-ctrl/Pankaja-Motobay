const crypto = require("crypto");

const encoder = new TextEncoder();

function json(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function env(name) {
  return String(process.env[name] || "").trim();
}

function supabaseConfig() {
  const url = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  return { url, key };
}

async function sb(path, options = {}) {
  const { url, key } = supabaseConfig();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.hint || "Database request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", env("SESSION_SECRET") || "change-this-secret").update(value).digest("base64url");
}

function makeSession(email) {
  const payload = base64url(JSON.stringify({ email, exp: Date.now() + 1000 * 60 * 60 * 8 }));
  return `${payload}.${sign(payload)}`;
}

function getCookie(event, name) {
  const raw = event.headers?.cookie || event.headers?.Cookie || "";
  const match = raw.split(";").map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function isAdmin(event) {
  const token = getCookie(event, "admin_session");
  if (!token || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  if (sign(payload) !== signature) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() && data.email.toLowerCase() === env("ADMIN_EMAIL").toLowerCase();
  } catch {
    return false;
  }
}

function requireAdmin(event) {
  if (!isAdmin(event)) return json(401, { error: "Unauthorized" });
  return null;
}

function cookie(value, maxAge = 60 * 60 * 8) {
  return `admin_session=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return "admin_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax";
}

async function body(event) {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
}

async function handle(event) {
  const path = (event.path || "").replace(/^\/\.netlify\/functions\/api/, "").replace(/^\/api/, "") || "/";
  const method = event.httpMethod;
  const b = await body(event);

  if (method === "GET" && path === "/health") {
    return json(200, { ok: true, service: "Pankaja Motobay" });
  }

  if (method === "POST" && path === "/admin/login") {
    const email = clean(b.email, 160).toLowerCase();
    const password = String(b.password || "");
    if (!email || !password) return json(400, { error: "Email and password required" });

    // Authenticate against Supabase Auth. Use the anon key when available;
    // the service-role key is a safe server-side fallback if the anon key
    // was not added to Netlify environment variables.
    const { url } = supabaseConfig();
    const authKey = env("SUPABASE_ANON_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");

    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: authKey,
        Authorization: `Bearer ${authKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password }),
    });

    const authData = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok || !authData.access_token) {
      console.error("Admin login failed:", authData?.msg || authData?.message || authData?.error_description || authResponse.status);
      return json(401, { error: "Invalid login" });
    }

    // If ADMIN_EMAIL is configured, only that account is allowed into the
    // admin panel. If it is not configured, the successfully authenticated
    // Supabase account is used.
    const configuredAdminEmail = env("ADMIN_EMAIL").toLowerCase();
    const authenticatedEmail = String(authData.user?.email || email).toLowerCase();

    if (configuredAdminEmail && authenticatedEmail !== configuredAdminEmail) {
      return json(401, { error: "This account is not authorized as the admin." });
    }

    return json(200, { success: true }, { "Set-Cookie": cookie(makeSession(authenticatedEmail)) });
  }

  if (method === "POST" && path === "/admin/logout") {
    const denied = requireAdmin(event); if (denied) return denied;
    return json(200, { success: true }, { "Set-Cookie": clearCookie() });
  }

  if (method === "GET" && path === "/admin/profile") {
    const denied = requireAdmin(event); if (denied) return denied;
    return json(200, { name: env("ADMIN_NAME") || "Pankaja Motobay Admin", email: env("ADMIN_EMAIL") });
  }

  if (method === "POST" && path === "/reviews") {
    const name = clean(b.name, 60), vehicle = clean(b.vehicle, 40), service = clean(b.service, 100), review = clean(b.review, 500), rating = Number(b.rating);
    if (!name || !vehicle || !service || !review) return json(400, { error: "Please complete all review fields." });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json(400, { error: "Please select a rating from 1 to 5 stars." });
    await sb("reviews", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name, vehicle, service, review, rating, status: "pending" }) });
    return json(200, { success: true, message: "Thank you! Your review was submitted and is waiting for approval." });
  }

  if (method === "GET" && path === "/reviews") {
    const data = await sb("reviews?select=id,name,vehicle,service,review,rating,created_at&status=eq.approved&order=created_at.desc");
    return json(200, data || []);
  }

  if (method === "POST" && path === "/appointments") {
    const row = {
      name: clean(b.name, 60), phone: clean(b.phone, 30), vehicle_type: clean(b.vehicleType, 40), vehicle_model: clean(b.vehicleModel, 80),
      service: clean(b.service, 100), date: clean(b.date, 20), problem: clean(b.problem, 500), status: "pending"
    };
    if (!row.name || !row.phone || !row.vehicle_type || !row.vehicle_model || !row.service || !row.date) return json(400, { error: "Please complete all required booking fields." });
    await sb("appointments", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    return json(200, { success: true });
  }

  if (method === "POST" && path === "/messages") {
    const row = { name: clean(b.name, 60), email: clean(b.email, 160), message: clean(b.message, 1000), status: "unread" };
    if (!row.name || !row.message) return json(400, { error: "Name and message are required." });
    await sb("messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    return json(200, { success: true });
  }

  if (method === "POST" && path === "/analytics") {
    const row = { event: clean(b.event, 80), page: clean(b.page, 200) };
    if (!row.event) return json(400, { error: "Event is required." });
    await sb("analytics", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    return json(200, { success: true });
  }

  if (path.startsWith("/admin/")) {
    const denied = requireAdmin(event); if (denied) return denied;
  }

  if (method === "GET" && path === "/admin/dashboard") {
    const [analytics, appointments, messages, pending, approved] = await Promise.all([
      sb("analytics?select=event"), sb("appointments?select=id,status"), sb("messages?select=id"),
      sb("reviews?select=id,rating,status&status=eq.pending"), sb("reviews?select=id,rating,status&status=eq.approved")
    ]);
    const visits = (analytics || []).filter(x => x.event === "page_view").length;
    const clicks = (analytics || []).filter(x => x.event !== "page_view").length;
    const completed = (appointments || []).filter(x => x.status === "completed").length;
    const ratings = (approved || []).map(x => Number(x.rating)).filter(Boolean);
    const rating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    return json(200, { visits, clicks, appointments: (appointments || []).length, completed, messages: (messages || []).length, pendingReviews: (pending || []).length, approvedReviews: (approved || []).length, rating });
  }

  if (method === "GET" && path === "/admin/appointments") return json(200, await sb("appointments?select=*&order=created_at.desc"));
  if (method === "GET" && path === "/admin/reviews") return json(200, await sb("reviews?select=*&order=created_at.desc"));
  if (method === "GET" && path === "/admin/messages") return json(200, await sb("messages?select=*&order=created_at.desc"));

  const appointmentMatch = path.match(/^\/admin\/appointments\/(\d+)$/);
  if (method === "PUT" && appointmentMatch) {
    const status = clean(b.status, 30);
    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) return json(400, { error: "Invalid appointment status." });
    await sb(`appointments?id=eq.${appointmentMatch[1]}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
    return json(200, { success: true });
  }

  const reviewMatch = path.match(/^\/admin\/reviews\/(\d+)$/);
  if (method === "PUT" && reviewMatch) {
    const status = clean(b.status, 30);
    if (!["pending", "approved", "rejected"].includes(status)) return json(400, { error: "Invalid review status." });
    await sb(`reviews?id=eq.${reviewMatch[1]}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
    return json(200, { success: true });
  }

  const messageMatch = path.match(/^\/admin\/messages\/(\d+)$/);
  if (method === "PUT" && messageMatch) {
    const status = clean(b.status, 20);
    if (!["unread", "read"].includes(status)) return json(400, { error: "Invalid message status." });
    await sb(`messages?id=eq.${messageMatch[1]}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
    return json(200, { success: true });
  }

  return json(404, { error: "Not found" });
}

exports.handler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    console.error(error);
    return json(error.status || 500, { error: error.message || "Server error" });
  }
};
