/**
 * Server-side order creation for the mock API.
 *
 * Never trusts the client: prices come from the menu "database", the coupon
 * is re-validated, and the address/payment are re-checked with the same
 * domain rules the checkout form uses. Only a card's brand and last 4 digits
 * are ever stored.
 */
import { MAX_QTY_PER_ITEM } from "../domain/cart.js";
import { findCoupon } from "../domain/coupons.js";
import { priceOrder, TIP_OPTIONS } from "../domain/pricing.js";
import { normalizePhone, validateAddress, validateUpi } from "../domain/validation.js";
import { DEFAULT_CITY_CENTER, buildRoute, hashString, isLatLng, offsetPoint, routeLength } from "../domain/geo.js";
import { getOrderProgress } from "../domain/orderStatus.js";

const RIDERS = [
  { name: "Ravi Kumar", vehicle: "Honda Activa · MH12 AB 4821" },
  { name: "Sneha Patil", vehicle: "TVS Jupiter · MH12 KL 1937" },
  { name: "Arjun Mehta", vehicle: "Hero Splendor · MH14 CD 7710" },
  { name: "Imran Shaikh", vehicle: "Ather 450X · MH12 EV 2045" },
];

const BRAND_LABELS = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", rupay: "RuPay", card: "Card" };

export class OrderError extends Error {
  /** @param {string} code - machine-readable, e.g. "COUPON_INVALID" */
  constructor(message, code = "INVALID_ORDER", status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const newOrderId = () =>
  `FD${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

function sanitizePayment(payment = {}) {
  switch (payment.method) {
    case "cod":
      return { method: "cod", label: "Cash on delivery", paid: false };
    case "upi": {
      const error = validateUpi(payment.upiId);
      if (error) throw new OrderError(error, "PAYMENT_INVALID");
      return { method: "upi", label: `UPI · ${String(payment.upiId).trim()}`, paid: true };
    }
    case "card": {
      if (!/^\d{4}$/.test(String(payment.last4))) throw new OrderError("Card details are incomplete.", "PAYMENT_INVALID");
      const brand = BRAND_LABELS[payment.brand] ? payment.brand : "card";
      return { method: "card", brand, last4: payment.last4, label: `${BRAND_LABELS[brand]} •••• ${payment.last4}`, paid: true };
    }
    default:
      throw new OrderError("Choose a payment method.", "PAYMENT_INVALID");
  }
}

function resolveLines(items, menuById) {
  if (!Array.isArray(items) || items.length === 0) throw new OrderError("Your cart is empty.", "CART_EMPTY");
  const lines = items.map(({ id, qty }) => {
    const product = menuById.get(id);
    if (!product) throw new OrderError("Some dishes in your cart are no longer available.", "ITEM_UNAVAILABLE");
    const cleanQty = Math.min(MAX_QTY_PER_ITEM, Math.max(1, Math.floor(Number(qty)) || 1));
    return { id, title: product.title, price: product.price, qty: cleanQty, veg: product.veg, restaurant: product.restaurant };
  });
  if (new Set(lines.map((l) => l.restaurant?.id)).size > 1) {
    throw new OrderError("All dishes in an order must be from the same restaurant.", "MIXED_RESTAURANTS");
  }
  return lines;
}

/**
 * @param {{ body: object, menuById: Map, coupons: object[], isFirstOrder: boolean,
 *           speed: number, idempotencyKey?: string, now?: Date }} input
 * @throws {OrderError}
 */
export function buildOrder({ body, menuById, coupons, isFirstOrder, speed, idempotencyKey, now = new Date() }) {
  if (!body || typeof body !== "object") throw new OrderError("Invalid order.");

  const lines = resolveLines(body.items, menuById);
  const addressError = validateAddress(body.address);
  if (addressError) throw new OrderError(addressError, "ADDRESS_INVALID");
  const payment = sanitizePayment(body.payment);

  let coupon = null;
  if (body.couponCode) {
    coupon = findCoupon(coupons, body.couponCode);
    if (!coupon) throw new OrderError(`${body.couponCode} is no longer available.`, "COUPON_INVALID");
  }
  const tip = TIP_OPTIONS.includes(Number(body.tip)) ? Number(body.tip) : 0;
  const pricing = priceOrder({ lines, coupon, tip, isFirstOrder, now });
  if (pricing.coupon && !pricing.coupon.ok) throw new OrderError(pricing.coupon.reason, "COUPON_INVALID");
  if (typeof body.expectedTotal === "number" && Math.abs(body.expectedTotal - pricing.total) > 0.01) {
    throw new OrderError("Prices changed since you opened checkout. Please review the new total.", "PRICE_CHANGED", 409);
  }

  const id = newOrderId();
  const seed = hashString(id);
  // No shared location: drop the pin somewhere plausible in the default city.
  const customerLocation = isLatLng(body.location)
    ? body.location
    : offsetPoint(DEFAULT_CITY_CENTER, 400 + (seed % 2500), seed % 360);
  // The restaurant's nearest branch: 1.8-3 km away, in a direction derived from the order id.
  const restaurantLocation = offsetPoint(customerLocation, 1800 + (seed % 1200), (seed >>> 8) % 360);
  const route = buildRoute(restaurantLocation, customerLocation, seed);
  const { address } = body;

  return {
    id,
    idempotencyKey: idempotencyKey || null,
    createdAt: now.toISOString(),
    timeScale: 1 / (speed || 1),
    restaurant: { ...lines[0].restaurant, location: restaurantLocation },
    customer: {
      name: address.name.trim(),
      phone: normalizePhone(address.phone),
      address: [address.flat, address.area, address.landmark, `${address.city} ${address.pincode}`]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(", "),
      location: customerLocation,
    },
    items: lines.map(({ restaurant, ...line }) => line),
    pricing,
    payment,
    rider: RIDERS[seed % RIDERS.length],
    route,
    distanceKm: Math.round(routeLength(route) / 100) / 10,
  };
}

/** Attach live status, computed for the moment of the request. */
export const withProgress = (order, now = new Date()) => {
  const { idempotencyKey, ...publicOrder } = order;
  return { ...publicOrder, progress: getOrderProgress(order, now), serverTime: now.toISOString() };
};
