/**
 * Pricing engine: the single place order totals are calculated.
 *
 * Used by the cart page, the checkout summary and the mock server's
 * POST /api/orders, so the price a customer sees is exactly what gets charged.
 *
 *   subtotal      sum of price x qty
 *   - discount    from a valid coupon
 *   + delivery    ₹30, free at ₹499+ or with a free-delivery coupon
 *   + GST         5% of (subtotal - discount)
 *   + tip         optional, for the rider
 *   = total
 */
import { evaluateCoupon } from "./coupons.js";

export const PRICING = Object.freeze({
  deliveryFee: 30,
  freeDeliveryThreshold: 499,
  gstRate: 0.05,
});

export const TIP_OPTIONS = Object.freeze([0, 20, 30, 50]);

/** Round to paise so floating-point noise never reaches the UI. */
export const roundMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * @param {{
 *   lines: { price: number, qty: number }[],
 *   coupon?: object | null,
 *   tip?: number,
 *   isFirstOrder?: boolean,
 *   now?: Date,
 * }} input
 * @returns {{
 *   itemCount: number, subtotal: number, discount: number,
 *   deliveryFee: number, deliveryWaived: boolean, gst: number, tip: number, total: number,
 *   savings: number, amountToFreeDelivery: number,
 *   coupon: null | { code: string, ok: boolean, reason?: string, shortfall?: number },
 * }}
 */
export function priceOrder({ lines, coupon = null, tip = 0, isFirstOrder = false, now = new Date() }) {
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.price * line.qty, 0));

  const couponResult = coupon && itemCount > 0 ? evaluateCoupon(coupon, { subtotal, isFirstOrder, now }) : null;
  const discount = couponResult?.ok ? couponResult.discount : 0;

  const qualifiesByAmount = subtotal >= PRICING.freeDeliveryThreshold;
  const deliveryWaived = itemCount > 0 && (qualifiesByAmount || Boolean(couponResult?.ok && couponResult.freeDelivery));
  const deliveryFee = itemCount === 0 || deliveryWaived ? 0 : PRICING.deliveryFee;

  const gst = roundMoney((subtotal - discount) * PRICING.gstRate);
  const cleanTip = itemCount > 0 ? Math.max(0, Number(tip) || 0) : 0;
  const total = roundMoney(subtotal - discount + deliveryFee + gst + cleanTip);

  return {
    itemCount,
    subtotal,
    discount,
    deliveryFee,
    deliveryWaived,
    gst,
    tip: cleanTip,
    total,
    savings: discount + (deliveryWaived ? PRICING.deliveryFee : 0),
    amountToFreeDelivery: itemCount > 0 && !qualifiesByAmount ? roundMoney(PRICING.freeDeliveryThreshold - subtotal) : 0,
    coupon: couponResult
      ? { code: coupon.code, ...pick(couponResult, ["ok", "reason", "shortfall"]) }
      : null,
  };
}

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((key) => obj[key] !== undefined).map((key) => [key, obj[key]]));
