/** Cart page: line items with quantity controls and the order summary. */
import { $ } from "../utils/dom.js";
import { escapeHtml, formatPrice } from "../utils/format.js";
import { getCartItems, changeQty, removeFromCart, computeTotals, subscribe } from "../store.js";

function cartItemHTML(item) {
  const id = escapeHtml(item.id);
  return `
    <div class="cart-item">
      <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.title)}" />
      <div style="flex:1">
        <h4>${escapeHtml(item.title)}</h4>
        <div>${formatPrice(item.price)}</div>
        <div style="margin-top:.6rem" class="qty-controls">
          <button class="qty-decrease" data-id="${id}" aria-label="Decrease quantity">-</button>
          <div style="padding:.2rem .6rem; border:1px solid #eee; border-radius:.4rem">${item.qty}</div>
          <button class="qty-increase" data-id="${id}" aria-label="Increase quantity">+</button>
          <button class="btn remove-item" data-id="${id}" style="margin-left:1rem">Remove</button>
        </div>
      </div>
      <div style="min-width:110px; text-align:right">
        <div>${formatPrice(Number(item.price) * Number(item.qty))}</div>
      </div>
    </div>
  `;
}

function summaryHTML(items) {
  const { subtotal, delivery, total } = computeTotals(items);
  return `
    <div style="background:white; padding:1rem; border-radius:1rem">
      <h3>Order Summary</h3>
      <div>Subtotal: ${formatPrice(subtotal)}</div>
      <div>Delivery: ${formatPrice(delivery)}</div>
      <div style="font-weight:700; margin-top:.6rem">Total: ${formatPrice(total)}</div>
      <div style="margin-top:1rem">
        <a href="checkout.html" class="btn">Proceed to Checkout</a>
      </div>
    </div>
  `;
}

export function init() {
  const container = $("#cart-container");
  const summary = $("#cart-summary");
  if (!container || !summary) return;

  function render() {
    const items = getCartItems();
    if (items.length === 0) {
      container.innerHTML = `<div class="text-center"><p>Your cart is empty</p><a class="btn" href="menu.html">Browse Menu</a></div>`;
      summary.innerHTML = "";
      return;
    }
    container.innerHTML = items.map(cartItemHTML).join("");
    summary.innerHTML = summaryHTML(items);
  }

  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const { id } = btn.dataset;
    if (btn.classList.contains("qty-increase")) changeQty(id, 1);
    else if (btn.classList.contains("qty-decrease")) changeQty(id, -1);
    else if (btn.classList.contains("remove-item")) removeFromCart(id);
  });

  subscribe(({ type }) => {
    if (type === "cart") render();
  });

  render();
}
