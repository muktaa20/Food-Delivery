/**
 * Turns the stored cart (ids + quantities) into a priced quote.
 *
 * Products, coupons and order history are fetched once and cached for the
 * page's lifetime, so quantity changes re-price instantly without waiting on
 * the network. Only dishes that aren't cached yet trigger another request.
 */
import { api } from "./api.js";
import { getCart, getCouponCode, setCartRestaurant } from "../store.js";
import { cartIds } from "../domain/cart.js";
import { evaluateCoupon, findCoupon, normalizeCode } from "../domain/coupons.js";
import { priceOrder } from "../domain/pricing.js";

export function createCartQuote() {
  const products = new Map();
  const unavailableIds = new Set();
  let coupons = [];
  let isFirstOrder = true;
  let loaded = false;
  let pending = null;

  const missingIds = () => cartIds(getCart()).filter((id) => !products.has(id) && !unavailableIds.has(id));

  const needsLoad = () => !loaded || missingIds().length > 0;

  /** Fetch whatever isn't cached yet. Concurrent calls share one request. */
  function load() {
    pending ??= (async () => {
      const ids = missingIds();
      const [items, couponList, orders] = await Promise.all([
        ids.length ? api.getMenu({ ids: ids.join(",") }) : [],
        loaded ? coupons : api.getCoupons(),
        loaded ? null : api.getOrders(),
      ]);
      items.forEach((p) => products.set(p.id, p));
      // Ids the API didn't return were removed from the menu (e.g. a dish from an old saved cart).
      ids.filter((id) => !products.has(id)).forEach((id) => unavailableIds.add(id));
      coupons = couponList;
      if (orders) isFirstOrder = orders.length === 0;
      loaded = true;
    })().finally(() => {
      pending = null;
    });
    return pending;
  }

  /** Price the current cart synchronously from cached data. */
  function compute({ tip = 0 } = {}) {
    const cart = getCart();
    const lines = [];
    const unavailable = [];
    Object.entries(cart.items).forEach(([id, qty]) => {
      const product = products.get(id);
      if (product) lines.push({ id, qty, price: product.price, lineTotal: product.price * qty, product });
      else unavailable.push({ id, qty });
    });

    const restaurant = cart.restaurant ?? lines[0]?.product.restaurant ?? null;
    if (!cart.restaurant && restaurant) setCartRestaurant(restaurant);

    const couponCode = getCouponCode();
    const coupon = couponCode ? findCoupon(coupons, couponCode) : null;
    const pricing = priceOrder({ lines, coupon, tip, isFirstOrder });

    return { cart, restaurant, lines, unavailable, couponCode, coupon, pricing, coupons, isFirstOrder };
  }

  /**
   * Check a code before saving it, so bad codes get instant feedback.
   * @returns {{ ok: true, code: string, message: string } | { ok: false, reason: string }}
   */
  function checkCoupon(code) {
    const clean = normalizeCode(code);
    if (!clean) return { ok: false, reason: "Enter a coupon code." };
    const coupon = findCoupon(coupons, clean);
    if (!coupon) return { ok: false, reason: `“${clean}” isn't a valid coupon code.` };

    const { pricing } = compute();
    const result = evaluateCoupon(coupon, { subtotal: pricing.subtotal, isFirstOrder });
    if (!result.ok) return result;
    const message = result.freeDelivery
      ? `${clean} applied: free delivery on this order`
      : `${clean} applied: you save ₹${result.discount}`;
    return { ok: true, code: clean, message };
  }

  return { load, needsLoad, compute, checkCoupon };
}
