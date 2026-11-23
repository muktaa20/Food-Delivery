/**
 * Coupon validation, shared by the cart UI (instant feedback) and the mock
 * server (authoritative re-check when an order is placed).
 *
 * Coupon shape:
 *   {
 *     code: "WELCOME50",
 *     type: "percent" | "flat" | "freeDelivery",
 *     value: 50,               // percent or rupees; unused for freeDelivery
 *     maxDiscount?: 100,       // cap for percent coupons
 *     minSubtotal?: 199,
 *     firstOrderOnly?: true,
 *     expiresAt?: "2026-08-31T23:59:59+05:30",
 *     description: "50% off up to ₹100 on your first order",
 *   }
 */

export const normalizeCode = (code) => String(code ?? "").trim().toUpperCase();

export const findCoupon = (coupons, code) => coupons.find((c) => c.code === normalizeCode(code)) ?? null;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * @param {object} coupon
 * @param {{ subtotal: number, isFirstOrder?: boolean, now?: Date }} context
 * @returns {{ ok: true, discount: number, freeDelivery: boolean }
 *         | { ok: false, reason: string, shortfall?: number }}
 *   `shortfall` is how much more the cart needs to reach `minSubtotal`.
 */
export function evaluateCoupon(coupon, { subtotal, isFirstOrder = false, now = new Date() }) {
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    return { ok: false, reason: `${coupon.code} expired on ${formatDate(coupon.expiresAt)}.` };
  }
  if (coupon.firstOrderOnly && !isFirstOrder) {
    return { ok: false, reason: `${coupon.code} is only valid on your first order.` };
  }
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    const shortfall = coupon.minSubtotal - subtotal;
    return { ok: false, reason: `Add ₹${shortfall} more to use ${coupon.code}.`, shortfall };
  }

  switch (coupon.type) {
    case "percent": {
      const raw = Math.floor((subtotal * coupon.value) / 100);
      return { ok: true, discount: Math.min(raw, coupon.maxDiscount ?? Infinity, subtotal), freeDelivery: false };
    }
    case "flat":
      return { ok: true, discount: Math.min(coupon.value, subtotal), freeDelivery: false };
    case "freeDelivery":
      return { ok: true, discount: 0, freeDelivery: true };
    default:
      return { ok: false, reason: `${coupon.code} can't be applied.` };
  }
}
