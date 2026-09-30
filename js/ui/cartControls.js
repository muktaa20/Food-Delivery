/**
 * "Add to Cart" button that turns into a − qty + stepper once the dish is in
 * the cart, plus the shared add/remove logic (restaurant conflicts, undo).
 */
import {
  addToCart,
  changeQty,
  getCart,
  getItemQty,
  removeFromCart,
  replaceCartWith,
  restoreCart,
  subscribe,
} from "../store.js";
import { MAX_QTY_PER_ITEM } from "../domain/cart.js";
import { escapeHtml } from "../utils/format.js";
import { showToast } from "./toast.js";
import { confirmDialog } from "./confirmDialog.js";

export function qtyStepperHTML(id, qty, title = "item") {
  const safeId = escapeHtml(id);
  const name = escapeHtml(title);
  return `
    <div class="qty-stepper">
      <button type="button" class="qty-btn" data-action="dec" data-id="${safeId}" aria-label="Remove one ${name}">
        <i class="fa-solid fa-minus" aria-hidden="true"></i>
      </button>
      <span class="qty-value" aria-label="${qty} in cart">${qty}</span>
      <button type="button" class="qty-btn" data-action="inc" data-id="${safeId}" aria-label="Add one more ${name}"
        ${qty >= MAX_QTY_PER_ITEM ? "disabled" : ""}>
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
      </button>
    </div>
  `;
}

const controlInnerHTML = (id, qty, title) =>
  qty > 0
    ? qtyStepperHTML(id, qty, title)
    : `<button type="button" class="btn add-to-cart" data-id="${escapeHtml(id)}">Add to Cart</button>`;

/** Placeholder that `bindCartControls` keeps in sync with the cart. */
export function cartControlHTML(product) {
  const qty = getItemQty(product.id);
  return `<div class="cart-control" data-id="${escapeHtml(product.id)}" data-title="${escapeHtml(product.title)}" data-qty="${qty}">${controlInnerHTML(product.id, qty, product.title)}</div>`;
}

/**
 * Add a product, asking first if it would replace a cart from another restaurant.
 * @returns {Promise<boolean>} whether the product was added
 */
export async function addProductToCart(product, { toast = true } = {}) {
  const result = addToCart(product);
  if (result.ok) {
    if (toast) showToast("Added to cart");
    return true;
  }
  if (!result.conflict) return false;

  const { current, incoming } = result.conflict;
  const confirmed = await confirmDialog({
    title: "Start a new cart?",
    message: `Your cart has dishes from ${current.name}. Adding this dish will clear it and start a new cart from ${incoming.name}.`,
    confirmLabel: "Start new cart",
    cancelLabel: "Keep current cart",
  });
  if (!confirmed) return false;
  replaceCartWith(product);
  showToast(`New cart started from ${incoming.name}`, { duration: 2000 });
  return true;
}

/** Decrease a line by one; removing the last one offers "Undo". */
export function decrementWithUndo(id, title) {
  if (getItemQty(id) > 1) {
    changeQty(id, -1);
    return;
  }
  removeWithUndo(id, title);
}

export function removeWithUndo(id, title) {
  const snapshot = getCart();
  removeFromCart(id);
  showToast(`Removed ${title}`, { action: { label: "Undo", onClick: () => restoreCart(snapshot) } });
}

export function incrementWithLimit(id) {
  if (getItemQty(id) >= MAX_QTY_PER_ITEM) {
    showToast(`You can add up to ${MAX_QTY_PER_ITEM} of a dish`, { duration: 2000 });
    return;
  }
  changeQty(id, 1);
}

/** Re-render any stale controls inside `root`, keeping keyboard focus on the same control. */
function syncCartControls(root) {
  root.querySelectorAll(".cart-control").forEach((control) => {
    const qty = getItemQty(control.dataset.id);
    if (Number(control.dataset.qty) === qty) return;

    const hadFocus = control.contains(document.activeElement);
    const focusedAction = document.activeElement?.dataset?.action;
    control.dataset.qty = qty;
    control.innerHTML = controlInnerHTML(control.dataset.id, qty, control.dataset.title);
    if (hadFocus) {
      const target =
        control.querySelector(`[data-action="${focusedAction}"]:not(:disabled)`) ??
        control.querySelector('[data-action="inc"], .add-to-cart');
      target?.focus();
    }
  });
}

/**
 * One delegated listener handles every current and future control in
 * `container`, so re-rendering cards never needs re-binding.
 * @param {(id: string) => object | undefined} findProduct - looks up a rendered product by id
 */
export function bindCartControls(container, findProduct) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart, .qty-btn");
    if (!btn || !container.contains(btn) || !btn.closest(".cart-control")) return;
    const { id } = btn.dataset;
    const title = btn.closest(".cart-control").dataset.title;

    if (btn.classList.contains("add-to-cart")) {
      const product = findProduct(id);
      if (product) addProductToCart(product);
    } else if (btn.dataset.action === "inc") {
      incrementWithLimit(id);
    } else if (btn.dataset.action === "dec") {
      decrementWithUndo(id, title);
    }
  });

  subscribe(({ type }) => {
    if (type === "cart") syncCartControls(container);
  });
}
