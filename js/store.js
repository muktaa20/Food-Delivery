/**
 * App state: cart, users and the current session.
 *
 * State lives in localStorage (via services/storage.js). Every mutation goes
 * through a function in this module, which persists the change and notifies
 * subscribers, so UI pieces like the header badge and cart page stay in sync
 * without calling each other.
 */
import { KEYS, readJSON, writeJSON, removeKey } from "./services/storage.js";

export const DELIVERY_FEE = 30;

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

/* ---------- Cart ----------
 * Shape: { [productId]: { id, title, price, img, qty } }
 * Items are snapshots, so the cart renders without waiting for the API.
 */

export function getCart() {
  return readJSON(KEYS.cart, {});
}

export function getCartItems() {
  return Object.values(getCart());
}

export function getCartCount() {
  return getCartItems().reduce((sum, item) => sum + Number(item.qty), 0);
}

function saveCart(cart) {
  writeJSON(KEYS.cart, cart);
  emit("cart");
}

/**
 * @param {{ id: string, title: string, price: number, img: string }} product - as returned by the API
 * @returns {boolean} false if no product was given
 */
export function addToCart(product, qty = 1) {
  if (!product?.id) return false;

  const { id } = product;
  const cart = getCart();
  if (cart[id]) {
    cart[id].qty = Number(cart[id].qty) + Number(qty);
  } else {
    cart[id] = {
      id: product.id,
      title: product.title,
      price: Number(product.price),
      img: product.img,
      qty: Number(qty),
    };
  }
  saveCart(cart);
  return true;
}

/** Adjust quantity by `delta`; the line is removed when it reaches 0. */
export function changeQty(id, delta) {
  const cart = getCart();
  if (!cart[id]) return;
  cart[id].qty = Number(cart[id].qty) + delta;
  if (cart[id].qty <= 0) delete cart[id];
  saveCart(cart);
}

export function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
}

export function clearCart() {
  removeKey(KEYS.cart);
  emit("cart");
}

/** Single source of truth for order pricing, shared by cart and checkout. */
export function computeTotals(items = getCartItems()) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0;
  return { subtotal, delivery, total: subtotal + delivery };
}

/* ---------- Orders ---------- */

/**
 * Build an order from the current cart and clear the cart.
 * Orders are not persisted yet.
 */
export function placeOrder({ name, phone, address }) {
  const order = {
    id: "ord_" + Date.now(),
    user: getAuth()?.username ?? "guest",
    items: getCartItems(),
    name,
    phone,
    address,
    createdAt: new Date().toISOString(),
  };
  clearCart();
  return order;
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
