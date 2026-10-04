"use strict";

const WHATSAPP_NUMBER = "94711294908";

function cleanText(value, maxLength = 500) {
    return String(value || "").trim().slice(0, maxLength);
}

function openWhatsApp(message = "Hello Pankaja Motobay, I would like to inquire about your vehicle repair services.") {
    const url =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
}

/* ================= MENU ================= */
const menuBtn = document.getElementById("menuBtn");
const navbar = document.getElementById("navbar");

if (menuBtn && navbar) {
    menuBtn.addEventListener("click", () => {
        navbar.classList.toggle("active");
    });

    document.querySelectorAll("#navbar a").forEach(link => {
        link.addEventListener("click", () => navbar.classList.remove("active"));
    });
}

/* ================= YEAR ================= */
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

/* ================= DATE ================= */
const dateInput = document.getElementById("date");
if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${yyyy}-${mm}-${dd}`;
}

/* ================= WHATSAPP BUTTONS ================= */
document.querySelectorAll("[data-whatsapp]").forEach(button => {
    button.addEventListener("click", event => {
        event.preventDefault();
        openWhatsApp();
    });
});

/* ================= BOOKING ================= */
const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {
    bookingForm.addEventListener("submit", async event => {
        event.preventDefault();

        const name = cleanText(document.getElementById("customerName")?.value, 60);
        const phone = cleanText(document.getElementById("phone")?.value, 30);
        const vehicleType = cleanText(document.getElementById("vehicleType")?.value, 40);
        const vehicleModel = cleanText(document.getElementById("vehicleModel")?.value, 80);
        const service = cleanText(document.getElementById("service")?.value, 100);
        const date = cleanText(document.getElementById("date")?.value, 20);
        const problem = cleanText(document.getElementById("problem")?.value, 500);

        if (!name || !phone || !vehicleType || !vehicleModel || !service || !date) {
            alert("Please complete all required fields.");
            return;
        }

        const message =
            `Hello Pankaja Motobay,%0A%0A` +
            `I would like to request a repair appointment.%0A%0A` +
            `Name: ${name}%0A` +
            `Phone: ${phone}%0A` +
            `Vehicle: ${vehicleType}%0A` +
            `Model: ${vehicleModel}%0A` +
            `Service: ${service}%0A` +
            `Preferred Date: ${date}%0A` +
            `Problem: ${problem || "Not specified"}`;

        try {
            const response = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    phone,
                    vehicleType,
                    vehicleModel,
                    service,
                    date,
                    problem
                })
            });

            if (!response.ok) throw new Error("Booking could not be saved.");

            openWhatsApp(decodeURIComponent(message));
        } catch (error) {
            alert("Booking could not be submitted. Please try WhatsApp directly.");
            console.error(error);
        }
    });
}

/* ================= REVIEWS ================= */
const reviewForm = document.getElementById("reviewForm");
const reviewStatus = document.getElementById("reviewStatus");
const reviewList = document.getElementById("reviewList");
const ratingInput = document.getElementById("reviewRating");
const starRating = document.getElementById("starRating");

if (starRating && ratingInput) {
    starRating.querySelectorAll("input[name='rating']").forEach(star => {
        star.addEventListener("change", () => {
            ratingInput.value = star.value;
        });
    });
}

if (reviewForm) {
    reviewForm.addEventListener("submit", async event => {
        event.preventDefault();

        const name = cleanText(document.getElementById("reviewName")?.value, 60);
        const vehicle = cleanText(document.getElementById("reviewVehicle")?.value, 40);
        const service = cleanText(document.getElementById("reviewService")?.value, 100);
        const review = cleanText(document.getElementById("reviewMessage")?.value, 500);
        const rating = Number(ratingInput?.value || 0);

        if (!name || !vehicle || !service || !review || !rating) {
            reviewStatus.textContent = "Please complete all fields and select a star rating.";
            return;
        }

        reviewStatus.textContent = "Submitting your review...";

        try {
            const response = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, vehicle, service, review, rating })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Review submission failed.");

            reviewStatus.textContent = data.message;
            reviewForm.reset();
            if (ratingInput) ratingInput.value = "0";
        } catch (error) {
            reviewStatus.textContent = error.message;
        }
    });
}

function renderStars(rating) {
    return "★".repeat(Number(rating)) + "☆".repeat(5 - Number(rating));
}

async function loadApprovedReviews() {
    if (!reviewList) return;

    try {
        const response = await fetch("/api/reviews");
        const reviews = await response.json();

        if (!reviews.length) {
            reviewList.innerHTML = `
                <div class="empty-reviews">
                    <p>No approved customer reviews yet.</p>
                </div>`;
            return;
        }

        reviewList.innerHTML = reviews.map(item => `
            <article class="customer-review">
                <div class="review-top">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="public-stars" aria-label="${item.rating} out of 5 stars">
                        ${renderStars(item.rating)}
                    </span>
                </div>
                <small>${escapeHtml(item.vehicle || "Vehicle")} • ${escapeHtml(item.service || "Service")}</small>
                <p>${escapeHtml(item.review)}</p>
            </article>
        `).join("");
    } catch (error) {
        reviewList.innerHTML = "";
        console.error(error);
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadApprovedReviews();

/* ================= HOME SLIDESHOW ================= */
const homeSlides = document.querySelectorAll(".home-image-slide");
const homeDots = document.querySelectorAll(".image-dot");
const imageNext = document.getElementById("imageNext");
const imagePrev = document.getElementById("imagePrev");

let homeCurrentSlide = 0;
let homeTimer;

function showHomeSlide(index) {
    if (!homeSlides.length) return;

    homeCurrentSlide =
        index >= homeSlides.length ? 0 :
        index < 0 ? homeSlides.length - 1 : index;

    homeSlides.forEach(slide => slide.classList.remove("active"));
    homeDots.forEach(dot => dot.classList.remove("active"));

    homeSlides[homeCurrentSlide].classList.add("active");
    if (homeDots[homeCurrentSlide]) {
        homeDots[homeCurrentSlide].classList.add("active");
    }
}

function startHomeTimer() {
    clearInterval(homeTimer);
    homeTimer = setInterval(() => {
        showHomeSlide(homeCurrentSlide + 1);
    }, 4000);
}

imageNext?.addEventListener("click", () => {
    showHomeSlide(homeCurrentSlide + 1);
    startHomeTimer();
});

imagePrev?.addEventListener("click", () => {
    showHomeSlide(homeCurrentSlide - 1);
    startHomeTimer();
});

homeDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
        showHomeSlide(index);
        startHomeTimer();
    });
});

showHomeSlide(0);
startHomeTimer();

/* ================= ANALYTICS ================= */
async function trackEvent(eventName) {
    try {
        await fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: eventName,
                page: window.location.pathname
            })
        });
    } catch (error) {
        console.error(error);
    }
}

trackEvent("page_view");

document.querySelectorAll("a, button").forEach(element => {
    element.addEventListener("click", () => {
        if (element.dataset.whatsapp !== undefined) {
            trackEvent("whatsapp_click");
        } else if (element.id === "imageNext" || element.id === "imagePrev") {
            trackEvent("gallery_click");
        }
    });
});
