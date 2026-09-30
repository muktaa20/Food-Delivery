/** Checkout page: delivery details form and the priced order summary. */
import { $ } from "../utils/dom.js";
import { enableSubmit } from "../utils/forms.js";
import { escapeHtml, formatPrice } from "../utils/format.js";
import { clearCart, getCart, removeCoupon } from "../store.js";
import { isCartEmpty } from "../domain/cart.js";
import { createCartQuote } from "../services/cartQuote.js";
import { billDetailsHTML } from "../ui/billDetails.js";
import { renderError } from "../ui/states.js";

const REDIRECT_DELAY_MS = 1400;

function summaryHTML({ lines, pricing }) {
  const items = lines
    .map((l) => `<li class="summary-line"><span>${escapeHtml(l.product.title)} × ${l.qty}</span><span>${formatPrice(l.lineTotal)}</span></li>`)
    .join("");
  return `<h3>Order</h3><ul class="summary-lines">${items}</ul>${billDetailsHTML(pricing)}`;
}

export function init() {
  const form = $("#checkout-form");
  const summaryBox = $("#checkout-summary");
  const msg = $("#checkout-msg");
  if (!form || !summaryBox) return;

  const quote = createCartQuote();

  async function loadSummary() {
    if (isCartEmpty(getCart())) {
      summaryBox.innerHTML = `<div class="text-center">Your cart is empty. <a class="btn" href="menu.html">Browse Menu</a></div>`;
      return;
    }
    try {
      await quote.load();
      summaryBox.innerHTML = summaryHTML(quote.compute());
    } catch (err) {
      renderError(summaryBox, err.message, loadSummary);
    }
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();

    if (isCartEmpty(getCart())) {
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

    clearCart();
    removeCoupon();
    form.reset();
    msg.textContent = "Order placed! Thank you.";
    setTimeout(() => {
      window.location.href = "index.html";
    }, REDIRECT_DELAY_MS);
  });
  enableSubmit(form);
  loadSummary();
}
