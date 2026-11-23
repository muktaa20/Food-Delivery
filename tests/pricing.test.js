import { describe, it, expect } from "vitest";
import { evaluateCoupon, findCoupon, normalizeCode } from "../js/domain/coupons.js";
import { PRICING, priceOrder, roundMoney } from "../js/domain/pricing.js";
import { COUPONS } from "../js/mocks/data/coupons.js";

const coupon = (code) => findCoupon(COUPONS, code);
const NOW = new Date("2026-09-30T12:00:00+05:30");

describe("evaluateCoupon", () => {
  it("caps percent discounts at maxDiscount", () => {
    expect(evaluateCoupon(coupon("WELCOME50"), { subtotal: 300, isFirstOrder: true, now: NOW })).toEqual({
      ok: true,
      discount: 100,
      freeDelivery: false,
    });
    expect(evaluateCoupon(coupon("WELCOME50"), { subtotal: 199, isFirstOrder: true, now: NOW }).discount).toBe(99);
  });

  it("enforces the minimum order and reports the shortfall", () => {
    const result = evaluateCoupon(coupon("FLAT75"), { subtotal: 350, now: NOW });
    expect(result).toMatchObject({ ok: false, shortfall: 49 });
    expect(result.reason).toBe("Add ₹49 more to use FLAT75.");
  });

  it("rejects first-order coupons for returning customers", () => {
    const result = evaluateCoupon(coupon("WELCOME50"), { subtotal: 500, isFirstOrder: false, now: NOW });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/first order/);
  });

  it("rejects expired coupons", () => {
    const result = evaluateCoupon(coupon("MONSOON20"), { subtotal: 500, now: NOW });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/^MONSOON20 expired on 31 Aug 2026/);
  });

  it("never discounts more than the subtotal", () => {
    const bigFlat = { code: "BIG", type: "flat", value: 1000 };
    expect(evaluateCoupon(bigFlat, { subtotal: 120, now: NOW }).discount).toBe(120);
  });

  it("normalizes codes for lookup", () => {
    expect(normalizeCode("  flat75 ")).toBe("FLAT75");
    expect(findCoupon(COUPONS, "freeship")?.code).toBe("FREESHIP");
    expect(findCoupon(COUPONS, "NOPE")).toBeNull();
  });
});

describe("priceOrder", () => {
  const lines = (...pairs) => pairs.map(([price, qty]) => ({ price, qty }));

  it("prices an empty cart at zero", () => {
    const p = priceOrder({ lines: [], tip: 50 });
    expect(p).toMatchObject({ subtotal: 0, deliveryFee: 0, gst: 0, tip: 0, total: 0, amountToFreeDelivery: 0 });
  });

  it("adds delivery and GST below the free-delivery threshold", () => {
    const p = priceOrder({ lines: lines([49, 2], [199, 1]), now: NOW });
    expect(p.subtotal).toBe(297);
    expect(p.deliveryFee).toBe(PRICING.deliveryFee);
    expect(p.gst).toBe(14.85);
    expect(p.total).toBe(341.85);
    expect(p.amountToFreeDelivery).toBe(202);
  });

  it("waives delivery at the threshold", () => {
    const p = priceOrder({ lines: lines([499, 1]), now: NOW });
    expect(p.deliveryWaived).toBe(true);
    expect(p.deliveryFee).toBe(0);
    expect(p.savings).toBe(PRICING.deliveryFee);
  });

  it("applies GST after the coupon discount and adds the tip", () => {
    const p = priceOrder({ lines: lines([249, 2]), coupon: coupon("FLAT75"), tip: 20, now: NOW });
    expect(p.subtotal).toBe(498);
    expect(p.discount).toBe(75);
    expect(p.gst).toBe(21.15);
    expect(p.total).toBe(roundMoney(498 - 75 + 30 + 21.15 + 20));
    expect(p.coupon).toEqual({ code: "FLAT75", ok: true });
  });

  it("free-delivery coupons waive the fee", () => {
    const p = priceOrder({ lines: lines([150, 2]), coupon: coupon("FREESHIP"), now: NOW });
    expect(p.deliveryFee).toBe(0);
    expect(p.discount).toBe(0);
    expect(p.savings).toBe(30);
  });

  it("keeps an invalid coupon attached with its reason but no discount", () => {
    const p = priceOrder({ lines: lines([99, 1]), coupon: coupon("FLAT75"), now: NOW });
    expect(p.discount).toBe(0);
    expect(p.coupon).toMatchObject({ code: "FLAT75", ok: false, shortfall: 300 });
  });
});
