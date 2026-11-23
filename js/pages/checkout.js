/**
 * Checkout: a three-step form (Address -> Payment -> Review) beside a live
 * order summary. Each step is validated inline before moving on; the order is
 * re-validated and re-priced by the server (POST /api/orders), then the user
 * lands on the live tracking page.
 */
import { $, $$ } from "../utils/dom.js";
import { enableSubmit } from "../utils/forms.js";
import { escapeHtml, formatPrice } from "../utils/format.js";
import { api } from "../services/api.js";
import { createCartQuote } from "../services/cartQuote.js";
import { getCurrentPosition, reverseGeocode } from "../services/location.js";
import { completeCheckout, getAuth, getCart, getSavedAddress, removeCoupon, saveAddress } from "../store.js";
import { isCartEmpty } from "../domain/cart.js";
import { TIP_OPTIONS } from "../domain/pricing.js";
import {
  ADDRESS_VALIDATORS,
  cardBrand,
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  validateCvv,
  validateExpiry,
  validateUpi,
} from "../domain/validation.js";
import { billDetailsHTML } from "../ui/billDetails.js";
import { renderEmpty, renderError } from "../ui/states.js";

const STEPS = ["address", "payment", "review"];
const ADDRESS_FIELDS = ["name", "phone", "flat", "area", "landmark", "city", "pincode"];
const PAYMENT_FIELDS = { cod: [], upi: ["upiId"], card: ["cardNumber", "expiry", "cvv"] };
const BRAND_LABELS = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", rupay: "RuPay" };

const VALIDATORS = {
  ...ADDRESS_VALIDATORS,
  upiId: validateUpi,
  cardNumber: validateCardNumber,
  expiry: (value) => validateExpiry(value),
  cvv: (value, fields) => validateCvv(value, cardBrand(fields.cardNumber.value)),
};

const summarySkeleton = `
  <div aria-hidden="true">
    <div class="skeleton skeleton-line short"></div>
    <div class="skeleton skeleton-line"></div>
    <div class="skeleton skeleton-line"></div>
    <div class="skeleton skeleton-line price"></div>
  </div>
`;

export function init() {
  const root = $("#checkout-root");
  const form = $("#checkout-form");
  const summary = $("#checkout-summary");
  const msg = $("#checkout-msg");
  if (!root || !form || !summary) return;

  const fields = form.elements;
  const placeButton = $("#place-order");
  const locationStatus = $("#location-status");
  const locateButton = $("#use-location");

  let quote = createCartQuote();
  let quoteReady = false;
  let step = "address";
  let tip = 0;
  let pin = null; // [lat, lng] from geolocation, sent so the rider heads to the right spot
  let submitting = false;
  const touched = new Set();
  // One key per checkout visit: if a response is lost and the user retries, the server returns the same order.
  const idempotencyKey = crypto.randomUUID();

  const markReady = () => (document.body.dataset.ready = "true");
  const paymentMethod = () => fields.payment.value;

  /* ---------- Validation ---------- */

  function showFieldError(name, error) {
    fields[name].setAttribute("aria-invalid", String(Boolean(error)));
    const slot = $(`#err-${name}`);
    if (slot) slot.textContent = error;
  }

  function validateField(name) {
    const error = VALIDATORS[name]?.(fields[name].value, fields) ?? "";
    showFieldError(name, error);
    return !error;
  }

  const fieldsForStep = (name) =>
    name === "address" ? Object.keys(ADDRESS_VALIDATORS) : name === "payment" ? PAYMENT_FIELDS[paymentMethod()] : [];

  /** Validate every field in a step; focuses the first invalid one. */
  function validateStep(name) {
    const names = fieldsForStep(name);
    names.forEach((n) => touched.add(n));
    const invalid = names.filter((n) => !validateField(n));
    if (invalid.length) fields[invalid[0]].focus();
    return invalid.length === 0;
  }

  /* ---------- Steps ---------- */

  function showStep(name, { focus = true } = {}) {
    step = name;
    const current = STEPS.indexOf(name);
    $$(".step", form).forEach((fs) => (fs.hidden = fs.dataset.step !== name));
    $$(".stepper li").forEach((li) => {
      const index = STEPS.indexOf(li.dataset.step);
      li.classList.toggle("is-current", index === current);
      li.classList.toggle("is-done", index < current);
      if (index === current) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    if (name === "review") renderReview();
    msg.textContent = "";
    if (!focus) return;

    const legend = $(`.step[data-step="${name}"] legend`, form);
    legend.tabIndex = -1;
    legend.focus({ preventScroll: true });
    if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Going back is always allowed; going forward validates every step in between. */
  function goTo(target) {
    const from = STEPS.indexOf(step);
    const to = STEPS.indexOf(target);
    for (let i = from; i < to; i++) {
      if (!validateStep(STEPS[i])) {
        if (i !== from) showStep(STEPS[i]);
        return;
      }
    }
    showStep(target);
  }

  /* ---------- Reading the form ---------- */

  function readAddress() {
    return Object.fromEntries(ADDRESS_FIELDS.map((name) => [name, fields[name].value.trim()]));
  }

  function readPayment() {
    switch (paymentMethod()) {
      case "upi":
        return { method: "upi", upiId: fields.upiId.value.trim() };
      case "card": {
        const digits = fields.cardNumber.value.replace(/\D/g, "");
        return { method: "card", brand: cardBrand(digits), last4: digits.slice(-4) };
      }
      default:
        return { method: "cod" };
    }
  }

  function paymentLabel(payment) {
    if (payment.method === "upi") return `UPI · ${payment.upiId}`;
    if (payment.method === "card") return `${BRAND_LABELS[payment.brand] ?? "Card"} •••• ${payment.last4}`;
    return "Cash on delivery";
  }

  function renderReview() {
    const a = readAddress();
    $("#review-address").innerHTML = `
      <strong>${escapeHtml(a.name)}</strong> · ${escapeHtml(a.phone)}<br />
      ${escapeHtml([a.flat, a.area, a.landmark].filter(Boolean).join(", "))}<br />
      ${escapeHtml(`${a.city} ${a.pincode}`)}
      ${pin ? `<br /><span class="small text-success"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Pinned to your current location</span>` : ""}
    `;
    $("#review-payment").textContent = paymentLabel(readPayment());
  }

  /* ---------- Summary ---------- */

  function renderSummary() {
    const q = quote.compute({ tip });
    const lines = q.lines
      .map(
        (l) => `<li class="summary-line"><span>${escapeHtml(l.product.title)} × ${l.qty}</span><span>${formatPrice(l.lineTotal)}</span></li>`
      )
      .join("");
    const couponNote =
      q.pricing.coupon && !q.pricing.coupon.ok
        ? `<p class="small warning-msg">${escapeHtml(q.couponCode)} not applied: ${escapeHtml(q.pricing.coupon.reason)}</p>`
        : "";
    const unavailableNote = q.unavailable.length
      ? `<p class="small warning-msg">Some dishes are no longer available. <a href="cart.html">Review your cart</a></p>`
      : "";

    summary.innerHTML = `
      <h3>Order summary</h3>
      ${q.restaurant ? `<p class="small muted">From <strong>${escapeHtml(q.restaurant.name)}</strong></p>` : ""}
      <ul class="summary-lines mt-2">${lines}</ul>
      ${couponNote}${unavailableNote}
      ${billDetailsHTML(q.pricing)}
    `;
    placeButton.textContent = `Place order · ${formatPrice(q.pricing.total)}`;
    placeButton.disabled = submitting || q.unavailable.length > 0 || q.lines.length === 0;
    return q;
  }

  async function loadSummary() {
    summary.innerHTML = summarySkeleton;
    try {
      await quote.load();
      quoteReady = true;
      renderSummary();
    } catch (err) {
      renderError(summary, err.message, loadSummary);
    }
    markReady();
  }

  function renderTips() {
    $("#tip-options").innerHTML = TIP_OPTIONS.map(
      (amount) => `
        <label class="chip">
          <input type="radio" name="tip" value="${amount}" class="visually-hidden" ${amount === tip ? "checked" : ""} />
          <span>${amount ? formatPrice(amount) : "No tip"}</span>
        </label>`
    ).join("");
  }

  /* ---------- Geolocation ---------- */

  function setLocationStatus(text, tone = "") {
    locationStatus.textContent = text;
    locationStatus.dataset.tone = tone;
  }

  async function useMyLocation() {
    locateButton.disabled = true;
    setLocationStatus("Detecting your location…", "loading");
    try {
      pin = await getCurrentPosition();
    } catch (err) {
      pin = null;
      setLocationStatus(err.message, "error");
      locateButton.disabled = false;
      return;
    }

    setLocationStatus("Found you! Looking up your address…", "loading");
    try {
      const found = await reverseGeocode(pin);
      ["area", "city", "pincode"].forEach((name) => {
        if (found[name]) fields[name].value = found[name];
      });
      if (found.flat && !fields.flat.value.trim()) fields.flat.value = found.flat;
      ["area", "city", "pincode"].forEach((name) => found[name] && validateField(name));
      if (fields.flat.value.trim()) {
        setLocationStatus("Location pinned. Please check the address below.", "success");
      } else {
        setLocationStatus("Location pinned. Add your flat or house number to finish.", "success");
        fields.flat.focus();
      }
    } catch {
      setLocationStatus("Location pinned, but we couldn't look up the street address. Please type it in.", "warning");
    }
    locateButton.disabled = false;
  }

  /* ---------- Placing the order ---------- */

  async function placeOrder() {
    if (submitting || !quoteReady) return;
    for (const name of ["address", "payment"]) {
      if (!validateStep(name)) {
        showStep(name);
        return;
      }
    }
    const q = renderSummary();
    if (q.unavailable.length || q.lines.length === 0) return;

    submitting = true;
    placeButton.disabled = true;
    placeButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Placing order…`;
    msg.textContent = "";

    const address = readAddress();
    try {
      const order = await api.placeOrder(
        {
          items: q.lines.map(({ id, qty }) => ({ id, qty })),
          couponCode: q.pricing.coupon?.ok ? q.couponCode : null,
          tip,
          expectedTotal: q.pricing.total,
          address,
          location: pin,
          payment: readPayment(),
        },
        idempotencyKey
      );
      saveAddress({ ...address, location: pin });
      completeCheckout(order.id);
      // replace(): Back from tracking shouldn't return to a checkout for an empty cart.
      window.location.replace(`order.html?id=${encodeURIComponent(order.id)}`);
    } catch (err) {
      submitting = false;
      if (err.code === "COUPON_INVALID") {
        removeCoupon();
        msg.textContent = `${err.message} We've removed the coupon; please check the new total.`;
      } else if (err.code === "PRICE_CHANGED" || err.code === "ITEM_UNAVAILABLE") {
        msg.textContent = err.message;
        quote = createCartQuote();
        await quote.load().catch(() => {});
      } else {
        msg.textContent = `Couldn't place your order. ${err.message}`;
      }
      renderSummary();
    }
  }

  /* ---------- Prefill ---------- */

  function prefill() {
    const saved = getSavedAddress();
    if (saved) {
      ADDRESS_FIELDS.forEach((name) => {
        if (saved[name]) fields[name].value = saved[name];
      });
      pin = saved.location ?? null;
      if (pin) setLocationStatus("Using your last delivery address.", "success");
    } else {
      const auth = getAuth();
      if (auth?.name) fields.name.value = auth.name;
    }
  }

  function showPaymentDetails() {
    $$(".pay-details", form).forEach((el) => (el.hidden = el.dataset.method !== paymentMethod()));
  }

  /* ---------- Events ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (step === "review") {
      placeOrder();
      return;
    }
    if (validateStep(step)) showStep(STEPS[STEPS.indexOf(step) + 1]);
  });

  form.addEventListener("input", (e) => {
    const { name } = e.target;
    if (name === "cardNumber") {
      e.target.value = formatCardNumber(e.target.value);
      const brand = cardBrand(e.target.value);
      $("#card-brand").textContent = e.target.value && BRAND_LABELS[brand] ? BRAND_LABELS[brand] : "";
    } else if (name === "expiry") {
      e.target.value = formatExpiry(e.target.value);
    }
    if (touched.has(name)) validateField(name);
  });

  // Validate on leaving a field the user typed in, not while tabbing past empty ones.
  form.addEventListener("focusout", (e) => {
    const { name, value } = e.target;
    if (!VALIDATORS[name] || (!value.trim() && !touched.has(name))) return;
    touched.add(name);
    validateField(name);
  });

  form.addEventListener("change", (e) => {
    if (e.target.name === "payment") showPaymentDetails();
    if (e.target.name === "tip") {
      tip = Number(e.target.value);
      if (quoteReady) renderSummary();
    }
  });

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-goto]");
    if (btn) goTo(btn.dataset.goto);
  });

  locateButton.addEventListener("click", useMyLocation);

  /* ---------- Start ---------- */

  if (isCartEmpty(getCart())) {
    renderEmpty(root, "Your cart is empty. Add some dishes before checking out.", {
      label: "Browse menu",
      onClick: () => (window.location.href = "menu.html"),
    });
    markReady();
    return;
  }

  prefill();
  renderTips();
  showPaymentDetails();
  showStep("address", { focus: false });
  enableSubmit(form);
  placeButton.disabled = true;
  loadSummary();
}
