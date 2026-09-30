/**
 * Cart page: line items with steppers, bill details from the pricing engine,
 * and coupon entry with live validation.
 *
 * Prices are fetched from the API (the stored cart only has ids + quantities);
 * after the first load every change re-prices instantly from the cached quote.
 */
import { $ } from "../utils/dom.js";
import { escapeHtml, formatPrice } from "../utils/format.js";
import { enableSubmit } from "../utils/forms.js";
import { applyCouponCode, clearCart, getCart, removeCoupon, restoreCart, subscribe } from "../store.js";
import { isCartEmpty } from "../domain/cart.js";
import { evaluateCoupon } from "../domain/coupons.js";
import { createCartQuote } from "../services/cartQuote.js";
import { billDetailsHTML, freeDeliveryHTML } from "../ui/billDetails.js";
import { qtyStepperHTML, decrementWithUndo, incrementWithLimit, removeWithUndo } from "../ui/cartControls.js";
import { renderEmpty, renderError } from "../ui/states.js";
import { showToast } from "../ui/toast.js";

const vegBadgeHTML = (veg) =>
  `<span class="veg-badge ${veg ? "veg" : "non-veg"}" aria-label="${veg ? "Veg" : "Non-veg"}"></span>`;

function lineHTML({ id, qty, lineTotal, product }) {
  return `
    <div class="cart-item" data-id="${escapeHtml(id)}">
      <img src="${escapeHtml(product.img)}" alt="" />
      <div class="cart-item-info">
        <h4>${vegBadgeHTML(product.veg)} ${escapeHtml(product.title)}</h4>
        <p class="small muted">${formatPrice(product.price)} each</p>
        ${qtyStepperHTML(id, qty, product.title)}
      </div>
      <div class="cart-item-end">
        <strong>${formatPrice(lineTotal)}</strong>
        <button type="button" class="link-btn remove-item" data-id="${escapeHtml(id)}"
          data-title="${escapeHtml(product.title)}">Remove</button>
      </div>
    </div>
  `;
}

function unavailableLineHTML({ id }) {
  return `
    <div class="cart-item is-unavailable" data-id="${escapeHtml(id)}">
      <div class="cart-item-info">
        <h4>Dish no longer available</h4>
        <p class="small muted">This item was removed from the menu.</p>
      </div>
      <div class="cart-item-end">
        <button type="button" class="link-btn remove-item" data-id="${escapeHtml(id)}"
          data-title="unavailable dish">Remove</button>
      </div>
    </div>
  `;
}

const skeletonHTML = `
  <div class="cart-skeleton" aria-hidden="true">
    ${`<div class="cart-item">
         <div class="skeleton" style="width:80px;height:80px"></div>
         <div style="flex:1"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>
       </div>`.repeat(3)}
  </div>
`;

/** Re-render `container` and put focus back on the equivalent button, so keyboard users don't lose their place. */
function renderKeepingFocus(container, html) {
  const active = document.activeElement;
  const key = container.contains(active) && active.dataset.id
    ? `[data-id="${CSS.escape(active.dataset.id)}"]${active.dataset.action ? `[data-action="${active.dataset.action}"]` : ".remove-item"}`
    : null;
  container.innerHTML = html;
  if (key) container.querySelector(`${key}:not(:disabled)`)?.focus();
}

export function init() {
  const container = $("#cart-container");
  const aside = $("#cart-summary");
  if (!container || !aside) return;

  const els = {
    restaurant: $("#cart-restaurant"),
    bill: $("#bill-details"),
    checkout: $("#checkout-link"),
    blocked: $("#checkout-blocked"),
    couponApplied: $("#coupon-applied"),
    couponForm: $("#coupon-form"),
    couponInput: $("#coupon-input"),
    couponMsg: $("#coupon-msg"),
    offers: $("#offer-list"),
  };
  const quote = createCartQuote();

  /* ---------- Rendering ---------- */

  function showEmpty() {
    aside.hidden = true;
    els.restaurant.textContent = "";
    renderEmpty(container, "Your cart is empty. Good food is always cooking!", {
      label: "Browse menu",
      onClick: () => (location.href = "menu.html"),
    });
  }

  function renderItems({ lines, unavailable }) {
    renderKeepingFocus(
      container,
      `
        <div class="cart-items-head">
          <span>${lines.length + unavailable.length} ${lines.length + unavailable.length === 1 ? "item" : "items"}</span>
          <button type="button" class="link-btn" id="clear-cart">Clear cart</button>
        </div>
        ${lines.map(lineHTML).join("")}
        ${unavailable.map(unavailableLineHTML).join("")}
      `
    );
  }

  function renderSummary({ pricing, unavailable }) {
    els.bill.innerHTML = freeDeliveryHTML(pricing) + billDetailsHTML(pricing);

    const blocked = unavailable.length > 0 || pricing.itemCount === 0;
    els.checkout.classList.toggle("is-disabled", blocked);
    els.checkout.setAttribute("aria-disabled", String(blocked));
    els.blocked.hidden = !blocked;
    els.blocked.textContent = blocked ? "Remove unavailable dishes to continue." : "";
  }

  function renderCoupons({ couponCode, coupon, coupons, pricing, isFirstOrder }) {
    if (couponCode) {
      const status = pricing.coupon;
      const warning = !coupon
        ? `${couponCode} is no longer available.`
        : status && !status.ok
          ? status.reason
          : "";
      els.couponApplied.innerHTML = `
        <div class="coupon-applied ${warning ? "is-invalid" : ""}">
          <i class="fa-solid fa-ticket" aria-hidden="true"></i>
          <div>
            <strong>${escapeHtml(couponCode)}</strong>
            <p class="small">${warning ? escapeHtml(warning) : escapeHtml(coupon.description)}</p>
          </div>
          <button type="button" class="link-btn" id="remove-coupon">Remove</button>
        </div>
      `;
    } else {
      els.couponApplied.innerHTML = "";
    }
    els.couponForm.hidden = Boolean(couponCode);

    els.offers.innerHTML = coupons
      .map((c) => {
        const result = evaluateCoupon(c, { subtotal: pricing.subtotal, isFirstOrder });
        const applied = c.code === couponCode;
        return `
          <li class="offer ${result.ok ? "" : "is-disabled"}">
            <div>
              <strong>${escapeHtml(c.code)}</strong>
              <p class="small">${escapeHtml(c.description)}</p>
              ${result.ok ? "" : `<p class="small offer-hint">${escapeHtml(result.reason)}</p>`}
            </div>
            ${
              applied
                ? `<span class="offer-applied"><i class="fa-solid fa-check" aria-hidden="true"></i> Applied</span>`
                : `<button type="button" class="btn btn-sm" data-apply-coupon="${escapeHtml(c.code)}" ${result.ok ? "" : "disabled"}>Apply</button>`
            }
          </li>
        `;
      })
      .join("");
  }

  function render() {
    const q = quote.compute();
    aside.hidden = false;
    els.restaurant.innerHTML = q.restaurant ? `From <strong>${escapeHtml(q.restaurant.name)}</strong>` : "";
    renderItems(q);
    renderSummary(q);
    renderCoupons(q);
  }

  let firstLoad = true;
  async function refresh() {
    if (isCartEmpty(getCart())) return showEmpty();
    if (quote.needsLoad()) {
      if (firstLoad) {
        container.setAttribute("aria-busy", "true");
        container.innerHTML = skeletonHTML;
      }
      try {
        await quote.load();
      } catch (err) {
        aside.hidden = true;
        renderError(container, err.message, refresh);
        return;
      }
      container.removeAttribute("aria-busy");
      firstLoad = false;
      // The cart may have changed (or emptied) while the request was in flight.
      if (isCartEmpty(getCart())) return showEmpty();
    }
    render();
  }

  /* ---------- Coupons ---------- */

  function tryApplyCoupon(code) {
    const result = quote.checkCoupon(code);
    if (!result.ok) {
      els.couponMsg.className = "small error-msg";
      els.couponMsg.textContent = result.reason;
      return;
    }
    els.couponMsg.textContent = "";
    els.couponInput.value = "";
    applyCouponCode(result.code);
    showToast(result.message, { duration: 2500 });
  }

  els.couponForm.addEventListener("submit", (e) => {
    e.preventDefault();
    tryApplyCoupon(els.couponInput.value);
  });
  els.couponInput.addEventListener("input", () => (els.couponMsg.textContent = ""));
  enableSubmit(els.couponForm);

  aside.addEventListener("click", (e) => {
    const applyBtn = e.target.closest("[data-apply-coupon]");
    if (applyBtn) tryApplyCoupon(applyBtn.dataset.applyCoupon);
    if (e.target.closest("#remove-coupon")) {
      removeCoupon();
      showToast("Coupon removed");
    }
  });

  els.checkout.addEventListener("click", (e) => {
    if (els.checkout.getAttribute("aria-disabled") === "true") e.preventDefault();
  });

  /* ---------- Line items ---------- */

  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.id === "clear-cart") {
      const snapshot = getCart();
      clearCart();
      showToast("Cart cleared", { action: { label: "Undo", onClick: () => restoreCart(snapshot) } });
      return;
    }
    const { id, action } = btn.dataset;
    if (!id) return;
    const title = btn.dataset.title ?? btn.closest(".cart-item")?.querySelector("h4")?.textContent.trim();
    if (action === "inc") incrementWithLimit(id);
    else if (action === "dec") decrementWithUndo(id, title);
    else if (btn.classList.contains("remove-item")) removeWithUndo(id, title);
  });

  subscribe(({ type }) => {
    if (type === "cart") refresh();
  });

  refresh();
}
