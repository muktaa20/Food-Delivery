/** Seed coupons for the mock backend (validated by js/domain/coupons.js). */
export const COUPONS = [
  {
    code: "WELCOME50",
    type: "percent",
    value: 50,
    maxDiscount: 100,
    minSubtotal: 199,
    firstOrderOnly: true,
    description: "50% off up to ₹100 on your first order above ₹199",
  },
  {
    code: "FLAT75",
    type: "flat",
    value: 75,
    minSubtotal: 399,
    description: "Flat ₹75 off on orders above ₹399",
  },
  {
    code: "FREESHIP",
    type: "freeDelivery",
    minSubtotal: 299,
    description: "Free delivery on orders above ₹299",
  },
  {
    code: "MONSOON20",
    type: "percent",
    value: 20,
    maxDiscount: 80,
    expiresAt: "2026-08-31T23:59:59+05:30",
    description: "20% off up to ₹80 (monsoon special)",
  },
];
