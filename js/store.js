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
import { sha256Hex } from "./utils/sha256.js";

/* ---------- Subscriptions ---------- */

const listeners = new Set();

/**
 * Listen for state changes. The callback receives `{ type: "cart" | "auth" | "order" }`.
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
  else if (e.key === KEYS.activeOrder) emit("order");
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

/* ---------- Orders ---------- */

/** The order currently being delivered, shown as "Track order" in the header. */
export const getActiveOrderId = () => readJSON(KEYS.activeOrder, null);

/** Called after a successful checkout: empties the cart and starts tracking. */
export function completeCheckout(orderId) {
  removeKey(KEYS.cart);
  removeKey(KEYS.coupon);
  writeJSON(KEYS.activeOrder, orderId);
  emit("cart");
  emit("order");
}

export function clearActiveOrder(orderId) {
  if (orderId && getActiveOrderId() !== orderId) return;
  removeKey(KEYS.activeOrder);
  emit("order");
}

/** Last delivery address, used to prefill checkout. */
export const getSavedAddress = () => readJSON(KEYS.address, null);

export const saveAddress = (address) => writeJSON(KEYS.address, address);


function getUsers() {
  return readJSON(KEYS.users, []);
}

const normalize = (value) => String(value ?? "").trim().toLowerCase();

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  if (!crypto.subtle) return sha256Hex(data); // unavailable on plain-HTTP pages
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** @returns {{ name: string, username: string, email: string, createdAt?: string } | null} */
export function getAuth() {
  return readJSON(KEYS.auth, null);
}

/* The cart, coupon, order and address keys hold the signed-in user's data.
 * Logout moves them into a per-account store; login moves that account's back. */
const USER_DATA_KEYS = ["cart", "coupon", "activeOrder", "address"];

function saveUserData(username) {
  const snapshot = {};
  USER_DATA_KEYS.forEach((name) => {
    const value = readJSON(KEYS[name], null);
    if (value !== null) snapshot[name] = value;
  });
  writeJSON(KEYS.userData, { ...readJSON(KEYS.userData, {}), [username]: snapshot });
}

function loadUserData(username) {
  const snapshot = readJSON(KEYS.userData, {})[username] ?? {};
  USER_DATA_KEYS.forEach((name) => {
    if (name in snapshot) writeJSON(KEYS[name], snapshot[name]);
    else removeKey(KEYS[name]);
  });
  emit("cart");
  emit("order");
}

function setAuth(user) {
  const session = { name: user.name, username: user.username, email: user.email, createdAt: user.createdAt };
  if (!writeJSON(KEYS.auth, session)) return false;
  loadUserData(user.username);
  emit("auth");
  return true;
}

const STORAGE_ERROR = "Your browser storage is full or blocked, so we couldn't save this.";

/** Exact matches come first, so legacy accounts differing only by case stay separate. */
function matchingAccounts(identifier) {
  const exact = identifier.trim();
  const id = normalize(identifier);
  const isExact = (u) => u.username === exact || u.email === exact;
  const matches = getUsers().filter((u) => normalize(u.username) === id || normalize(u.email) === id);
  return [...matches.filter(isExact), ...matches.filter((u) => !isExact(u))];
}

async function passwordMatches(user, password) {
  if (user.passwordHash) return (await hashPassword(password, user.salt)) === user.passwordHash;
  return user.password === password; // accounts from before hashing
}

/** @returns {Promise<{ ok: true } | { ok: false, error: string, field?: string }>} */
export async function signup({ name, username, email, password }) {
  const users = getUsers();
  if (users.some((u) => normalize(u.username) === normalize(username))) {
    return { ok: false, field: "username", error: "That username is already taken." };
  }
  if (users.some((u) => normalize(u.email) === normalize(email))) {
    return { ok: false, field: "email", error: "An account with this email already exists." };
  }
  const salt = randomSalt();
  const user = {
    name: name.trim(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  if (!writeJSON(KEYS.users, [...users, user])) return { ok: false, field: "email", error: STORAGE_ERROR };
  if (!setAuth(user)) {
    writeJSON(KEYS.users, users);
    return { ok: false, field: "email", error: STORAGE_ERROR };
  }
  return { ok: true };
}

/**
 * @param {string} identifier - username or email
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function login(identifier, password) {
  for (const user of matchingAccounts(identifier)) {
    if (!(await passwordMatches(user, password))) continue;
    if (!user.passwordHash) {
      // Upgrade a plain-text legacy password in place.
      const salt = randomSalt();
      const { password: _plain, ...rest } = user;
      const upgraded = { ...rest, salt, passwordHash: await hashPassword(password, salt) };
      writeJSON(KEYS.users, getUsers().map((u) => (u.username === user.username ? upgraded : u)));
    }
    return setAuth(user) ? { ok: true } : { ok: false, error: STORAGE_ERROR };
  }
  return { ok: false, error: "Incorrect username/email or password." };
}

/* ---------- Password reset ----------
 * Flow: request a one-time code, verify it, then set a new password.
 * Only a hash of the code is stored. There is no mail server, so the caller
 * receives the code to display; a real backend would email it instead.
 */
const RESET_TTL_MS = 10 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;
const RESET_EXPIRED = { ok: false, expired: true, error: "This code has expired. Please request a new one." };

function activeReset() {
  const reset = readJSON(KEYS.passwordReset, null);
  if (reset && Date.now() < reset.expiresAt) return reset;
  removeKey(KEYS.passwordReset);
  return null;
}

/** @returns {Promise<{ ok: true, code: string, email: string, minutes: number } | { ok: false, error: string }>} */
export async function requestPasswordReset(identifier) {
  const matches = matchingAccounts(identifier);
  const exact = identifier.trim();
  const user = matches.find((u) => u.username === exact || u.email === exact) ?? (matches.length === 1 ? matches[0] : null);
  if (!user && matches.length > 1) {
    return { ok: false, error: "More than one account matches. Enter your username exactly as you created it." };
  }
  if (!user) return { ok: false, error: "We couldn't find an account with that username or email." };

  // Rejection sampling keeps all 6-digit codes equally likely.
  const limit = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  let value;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= limit);
  const code = String(value % 1_000_000).padStart(6, "0");

  const salt = randomSalt();
  const saved = writeJSON(KEYS.passwordReset, {
    username: user.username,
    salt,
    codeHash: await hashPassword(code, salt),
    expiresAt: Date.now() + RESET_TTL_MS,
    attempts: 0,
    verified: false,
  });
  if (!saved) return { ok: false, error: STORAGE_ERROR };
  return { ok: true, code, email: user.email, minutes: RESET_TTL_MS / 60_000 };
}

/** @returns {Promise<{ ok: true } | { ok: false, error: string, expired?: boolean }>} */
export async function verifyResetCode(code) {
  const reset = activeReset();
  if (!reset) return RESET_EXPIRED;
  if ((await hashPassword(code, reset.salt)) === reset.codeHash) {
    writeJSON(KEYS.passwordReset, { ...reset, verified: true });
    return { ok: true };
  }
  const attempts = reset.attempts + 1;
  if (attempts >= RESET_MAX_ATTEMPTS) {
    removeKey(KEYS.passwordReset);
    return { ok: false, expired: true, error: "Too many incorrect attempts. Please request a new code." };
  }
  writeJSON(KEYS.passwordReset, { ...reset, attempts });
  const left = RESET_MAX_ATTEMPTS - attempts;
  return { ok: false, error: `Incorrect code. ${left} ${left === 1 ? "attempt" : "attempts"} left.` };
}

/** Needs a verified code. The code is single-use. */
export async function setNewPassword(password) {
  const reset = activeReset();
  if (!reset?.verified) return RESET_EXPIRED;
  const users = getUsers();
  const index = users.findIndex((u) => u.username === reset.username);
  if (index < 0) {
    removeKey(KEYS.passwordReset);
    return RESET_EXPIRED;
  }
  const salt = randomSalt();
  const { password: _legacyPlainText, ...user } = users[index];
  users[index] = { ...user, salt, passwordHash: await hashPassword(password, salt) };
  if (!writeJSON(KEYS.users, users)) return { ok: false, error: "Could not save your new password." };
  removeKey(KEYS.passwordReset);
  // Another tab may still be signed in with the old password.
  if (getAuth()?.username === reset.username) logout();
  return { ok: true };
}

export function logout() {
  const auth = getAuth();
  if (auth) saveUserData(auth.username);
  USER_DATA_KEYS.forEach((name) => removeKey(KEYS[name]));
  removeKey(KEYS.auth);
  emit("cart");
  emit("order");
  emit("auth");
}
