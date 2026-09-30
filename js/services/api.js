/**
 * REST client. Pages call these functions and never use fetch directly.
 *
 * Requests go to /api/*, which Mock Service Worker answers inside the browser
 * (see js/mocks). The mock layer is loaded lazily on the first request, so
 * pages that don't need data never download it. To switch to a real backend,
 * remove `ensureBackend()`.
 */

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Relative on purpose: resolves correctly when the site is served from a sub-path.
const BASE_URL = "api";

let backendReady = null;

function ensureBackend() {
  backendReady ??= import("../mocks/browser.js")
    .then((mocks) => mocks.startMockApi())
    .catch((err) => {
      backendReady = null;
      throw new ApiError(`Couldn't start the mock API. ${err.message}`, 0);
    });
  return backendReady;
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const str = query.toString();
  return str ? `?${str}` : "";
}

/**
 * @param {string} path - e.g. "menu?category=pizza"
 * @param {{ signal?: AbortSignal }} [options] - aborting rejects with an AbortError, which callers should ignore
 */
async function request(path, { signal } = {}) {
  await ensureBackend();

  let response;
  try {
    response = await fetch(`${BASE_URL}/${path}`, { signal, headers: { Accept: "application/json" } });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.message || `Request failed with status ${response.status}.`, response.status);
  }
  return body;
}

export const api = {
  /** @param {{ category?: string, popular?: boolean, restaurantId?: string }} [filters] */
  getMenu: (filters, options) => request(`menu${toQueryString(filters)}`, options),
  getCategories: (options) => request("categories", options),
  getRestaurants: (options) => request("restaurants", options),
  getRestaurant: (id, options) => request(`restaurants/${encodeURIComponent(id)}`, options),
  getCoupons: (options) => request("coupons", options),
  getOrders: (options) => request("orders", options),
};

export const isAbortError = (err) => err?.name === "AbortError";
