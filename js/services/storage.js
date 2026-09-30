/**
 * Thin, fail-safe wrapper around localStorage.
 * Every read/write in the app goes through here, so swapping to IndexedDB
 * or a mock API later only touches this layer.
 */

// Key names are part of the persisted format; changing them drops existing user data.
export const KEYS = Object.freeze({
  legacyCart: "fd_cart_v1", // read once to migrate, then deleted
  cart: "fd_cart_v2",
  coupon: "fd_coupon_v1",
  users: "fd_users_v1",
  auth: "fd_auth_v1",
  recentSearches: "fd_recent_searches_v1",
});

/** Read and parse a JSON value, returning `fallback` if missing or corrupt. */
export function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Serialize and store a value. Returns false if storage is full or unavailable. */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Could not save "${key}" to localStorage`, err);
    return false;
  }
}

export function removeKey(key) {
  localStorage.removeItem(key);
}
