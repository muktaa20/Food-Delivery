/**
 * App state: cart, applied coupon, users and the current session.
 *
 * State lives in localStorage (via services/storage.js). Every mutation goes
 * through a function in this module, which persists the change and notifies
 * subscribers, so UI pieces like the header badge and cart page stay in sync
 * without calling each other. Cart rules themselves live in domain/cart.js.
 */
import { KEYS, readJSON, writeJSON, removeKey } from "./services/storage.js";
import {
  addItem,
  cartCount,
  emptyCart,
  migrateV1,
  normalizeCart,
  setItemQty,
} from "./domain/cart.js";
import { normalizeCode } from "./domain/coupons.js";

/* ---------- Subscriptions ---------- */

const listeners = new Set();

/**
 * Listen for state changes. The callback receives `{ type: "cart" | "auth" }`.
 * @returns {() => void} unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(type) {
  listeners.forEach((listener) => listener({ type }));
}

// Keep tabs in sync: another tab changing the cart or logging out updates this one.
window.addEventListener("storage", (e) => {
  if (e.key === KEYS.cart || e.key === KEYS.coupon) emit("cart");
  else if (e.key === KEYS.auth) emit("auth");
});

/* ---------- Cart ---------- */

/** One-time upgrade from the v1 format (full product snapshots) to v2 (ids + quantities). */
function migrateLegacyCart() {
  const legacy = readJSON(KEYS.legacyCart, null);
  if (!legacy) return;
  if (!readJSON(KEYS.cart, null)) writeJSON(KEYS.cart, migrateV1(legacy));
  removeKey(KEYS.legacyCart);
}
migrateLegacyCart();

/** @returns {{ restaurant: { id: string, name: string } | null, items: { [id: string]: number } }} */
export function getCart() {
  return normalizeCart(readJSON(KEYS.cart, emptyCart()));
}

export const getCartCount = () => cartCount(getCart());

export const getItemQty = (id) => getCart().items[id] ?? 0;

function saveCart(cart) {
  writeJSON(KEYS.cart, cart);
  emit("cart");
}

/**
 * @param {{ id: string, restaurant?: { id: string, name: string } }} product - as returned by the API
 * @returns {{ ok: true } | { ok: false, conflict?: { current: object, incoming: object } }}
 *   `conflict` means the dish is from another restaurant; ask the user, then call `replaceCartWith`.
 */
export function addToCart(product, qty = 1) {
  if (!product?.id) return { ok: false };
  const current = getCart();
  const { cart, conflict } = addItem(current, product, qty);
  if (conflict) return { ok: false, conflict: { current: current.restaurant, incoming: product.restaurant } };
  saveCart(cart);
  return { ok: true };
}

/** Empty the cart (and any coupon) and start again with `product`. */
export function replaceCartWith(product, qty = 1) {
  removeKey(KEYS.coupon);
  saveCart(addItem(emptyCart(), product, qty).cart);
}

export function setQty(id, qty) {
  saveCart(setItemQty(getCart(), id, qty));
}

/** Adjust quantity by `delta`; the line is removed when it reaches 0. */
export function changeQty(id, delta) {
  setQty(id, getItemQty(id) + delta);
}

export function removeFromCart(id) {
  setQty(id, 0);
}

/** Put back a cart captured earlier with getCart(), e.g. for "Undo". */
export function restoreCart(cart) {
  saveCart(normalizeCart(cart));
}

/** v1 carts don't know their restaurant; the cart page fills it in once products load. */
export function setCartRestaurant(restaurant) {
  const cart = getCart();
  if (cart.restaurant || !restaurant) return;
  writeJSON(KEYS.cart, { ...cart, restaurant: { id: restaurant.id, name: restaurant.name } });
}

export function clearCart() {
  removeKey(KEYS.cart);
  emit("cart");
}

/* ---------- Coupon ----------
 * Only the code is stored. Whether it still applies (minimum order, expiry,
 * first order) is re-evaluated by the pricing engine every time totals are shown.
 */

export const getCouponCode = () => readJSON(KEYS.coupon, null);

export function applyCouponCode(code) {
  writeJSON(KEYS.coupon, normalizeCode(code));
  emit("cart");
}

export function removeCoupon() {
  removeKey(KEYS.coupon);
  emit("cart");
}

/* ---------- Users & session ----------
 * Demo-only auth: passwords are stored in plain text in localStorage.
 */

function getUsers() {
  return readJSON(KEYS.users, []);
}

/** @returns {{ name: string, username: string, email: string } | null} */
export function getAuth() {
  return readJSON(KEYS.auth, null);
}

function setAuth(user) {
  writeJSON(KEYS.auth, user);
  emit("auth");
}

/** @returns {{ ok: true } | { ok: false, error: string }} */
export function signup({ name, username, email, password }) {
  const users = getUsers();
  if (users.some((u) => u.username === username || u.email === email)) {
    return { ok: false, error: "User with same username or email already exists." };
  }
  users.push({ name, username, email, password });
  writeJSON(KEYS.users, users);
  setAuth({ name, username, email });
  return { ok: true };
}

/**
 * @param {string} identifier - username or email
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function login(identifier, password) {
  const user = getUsers().find(
    (u) => (u.username === identifier || u.email === identifier) && u.password === password
  );
  if (!user) return { ok: false, error: "Invalid username/email or password." };
  setAuth({ name: user.name, username: user.username, email: user.email });
  return { ok: true };
}

export function logout() {
  removeKey(KEYS.auth);
  emit("auth");
}
