/**
 * REST client. Pages call these functions and never use fetch directly.
 *
 * Requests go to /api/*, which Mock Service Worker answers inside the browser
 * (see js/mocks). The mock layer is loaded lazily on the first request, so
 * pages that don't need data never download it. To switch to a real backend,
 * remove `ensureBackend()`.
 */

export class ApiError extends Error {
  /** @param {string} [code] - machine-readable reason from the server, e.g. "COUPON_INVALID" */
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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
 * @param {{ signal?: AbortSignal, method?: string, body?: object, headers?: object }} [options]
 *   Aborting rejects with an AbortError, which callers should ignore.
 */
async function request(path, { signal, method = "GET", body, headers = {} } = {}) {
  await ensureBackend();

  let response;
  try {
    response = await fetch(`${BASE_URL}/${path}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.message || `Request failed with status ${response.status}.`, response.status, data?.code);
  }
  return data;
}

export const api = {
  /** @param {{ category?: string, popular?: boolean, restaurantId?: string }} [filters] */
  getMenu: (filters, options) => request(`menu${toQueryString(filters)}`, options),
  getCategories: (options) => request("categories", options),
  getRestaurants: (options) => request("restaurants", options),
  getRestaurant: (id, options) => request(`restaurants/${encodeURIComponent(id)}`, options),
  getCoupons: (options) => request("coupons", options),
  getOrders: (options) => request("orders", options),
  getOrder: (id, options) => request(`orders/${encodeURIComponent(id)}`, options),
  /** @param {string} idempotencyKey - reuse the same key when retrying, so the order isn't placed twice */
  placeOrder: (order, idempotencyKey) =>
    request("orders", { method: "POST", body: order, headers: { "Idempotency-Key": idempotencyKey } }),
};

export const isAbortError = (err) => err?.name === "AbortError";
