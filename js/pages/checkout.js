/** Checkout page: delivery details form and order summary. */
import { $ } from "../utils/dom.js";
import { enableSubmit } from "../utils/forms.js";
import { escapeHtml, formatPrice } from "../utils/format.js";
import { getCartItems, computeTotals, placeOrder } from "../store.js";

const REDIRECT_DELAY_MS = 1400;

function renderSummary(box) {
  const items = getCartItems();
  if (items.length === 0) {
    box.innerHTML = `<div class="text-center">Your cart is empty. <a class="btn" href="menu.html">Browse Menu</a></div>`;
    return;
  }
  const { subtotal, delivery, total } = computeTotals(items);
  const lines = items
    .map(
      (it) =>
        `<li style="margin-bottom:.6rem">${escapeHtml(it.title)} x ${it.qty} — ${formatPrice(Number(it.price) * Number(it.qty))}</li>`
    )
    .join("");

  box.innerHTML = `
    <h3>Order</h3>
    <ul style="list-style:none; padding:0">${lines}</ul>
    <div>Subtotal: ${formatPrice(subtotal)}</div>
    <div>Delivery: ${formatPrice(delivery)}</div>
    <div style="font-weight:700; margin-top:.6rem">Total: ${formatPrice(total)}</div>
  `;
}

export function init() {
  const form = $("#checkout-form");
  const summaryBox = $("#checkout-summary");
  const msg = $("#checkout-msg");
  if (!form || !summaryBox) return;

  renderSummary(summaryBox);

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();

    if (getCartItems().length === 0) {
      msg.textContent = "Your cart is empty. Add some dishes first.";
      return;
    }

    const name = form["name"].value.trim();
    const phone = form["phone"].value.trim();
    const address = form["address"].value.trim();
    if (!name || !phone || !address) {
      msg.textContent = "Please fill all fields.";
      return;
    }

    placeOrder({ name, phone, address });
    form.reset();
    msg.textContent = "Order placed! Thank you.";
    setTimeout(() => {
      window.location.href = "index.html";
    }, REDIRECT_DELAY_MS);
  });
  enableSubmit(form);
}
