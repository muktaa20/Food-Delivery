/** Bill breakdown rows, shared by the cart and checkout summaries. */
import { formatPrice } from "../utils/format.js";
import { PRICING } from "../domain/pricing.js";

/** Progress towards free delivery, or a note that it's unlocked. */
export function freeDeliveryHTML(pricing) {
  if (pricing.itemCount === 0) return "";
  if (pricing.amountToFreeDelivery <= 0) {
    return `<p class="free-delivery unlocked"><i class="fa-solid fa-motorcycle" aria-hidden="true"></i> You've unlocked free delivery</p>`;
  }
  const percent = Math.round((pricing.subtotal / PRICING.freeDeliveryThreshold) * 100);
  return `
    <div class="free-delivery">
      <p>Add <strong>${formatPrice(pricing.amountToFreeDelivery)}</strong> more for free delivery</p>
      <div class="progress" role="progressbar" aria-label="Progress to free delivery"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
        <span style="width:${percent}%"></span>
      </div>
    </div>
  `;
}

/** @param {ReturnType<import("../domain/pricing.js").priceOrder>} pricing */
export function billDetailsHTML(pricing) {
  const row = (label, value, className = "") =>
    `<div class="bill-row ${className}"><span>${label}</span><span>${value}</span></div>`;

  const delivery = pricing.deliveryWaived
    ? `<s>${formatPrice(PRICING.deliveryFee)}</s> <strong class="text-success">FREE</strong>`
    : formatPrice(pricing.deliveryFee);

  return `
    <div class="bill">
      ${row("Item total", formatPrice(pricing.subtotal))}
      ${pricing.discount > 0 ? row(`Coupon (${pricing.coupon.code})`, `−${formatPrice(pricing.discount)}`, "text-success") : ""}
      ${row("Delivery fee", delivery)}
      ${row(`GST (${PRICING.gstRate * 100}%)`, formatPrice(pricing.gst))}
      ${pricing.tip > 0 ? row("Delivery tip", formatPrice(pricing.tip)) : ""}
      ${row("To pay", formatPrice(pricing.total), "bill-total")}
      ${pricing.savings > 0 ? `<p class="savings">You're saving ${formatPrice(pricing.savings)} on this order</p>` : ""}
    </div>
  `;
}
