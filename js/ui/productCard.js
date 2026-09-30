/**
 * Product card rendering and a delegated "Add to Cart" handler.
 */
import { addToCart } from "../store.js";
import { escapeHtml, formatPrice } from "../utils/format.js";
import { showToast } from "./toast.js";
import { doneLoading } from "./states.js";

function vegBadgeHTML(veg) {
  const label = veg ? "Veg" : "Non-veg";
  return `<span class="veg-badge ${veg ? "veg" : "non-veg"}" title="${label}" aria-label="${label}"></span>`;
}

/**
 * @param {object} product - a menu item from the API
 * @param {{ variant?: "home" | "menu" }} [options]
 *   "home" is the compact card with a View link; "menu" adds the description and a Go to Cart link.
 */
export function productCardHTML(product, { variant = "menu" } = {}) {
  const title = escapeHtml(product.title);
  const addButton = `<button class="btn add-to-cart" data-id="${escapeHtml(product.id)}">Add to Cart</button>`;

  const body =
    variant === "home"
      ? `<div class="card-actions">
           <a class="btn" href="menu.html">View</a>
           ${addButton}
         </div>`
      : `<p class="small para">${escapeHtml(product.desc || "")}</p>
         <div class="card-actions">
           ${addButton}
           <a class="btn" href="cart.html">Go to Cart</a>
         </div>`;

  return `
    <div class="order-card">
      <img src="${escapeHtml(product.img)}" alt="${title}" loading="lazy" />
      <div class="card-meta">
        ${vegBadgeHTML(product.veg)}
        ${product.rating ? `<span class="rating"><i class="fa-solid fa-star" aria-hidden="true"></i> ${product.rating.toFixed(1)}</span>` : ""}
      </div>
      <h4>${title}</h4>
      ${product.restaurant ? `<p class="card-restaurant">${escapeHtml(product.restaurant.name)}</p>` : ""}
      <div class="price">${formatPrice(product.price)}</div>
      ${body}
    </div>
  `;
}

export function renderProductCards(container, products, options) {
  container.innerHTML = products.map((p) => productCardHTML(p, options)).join("");
  doneLoading(container);
}

/**
 * One listener per container handles every current and future "Add to Cart"
 * button, so re-rendering the cards never needs re-binding.
 * @param {(id: string) => object | undefined} findProduct - looks up a rendered product by id
 */
export function bindAddToCart(container, findProduct) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart");
    if (!btn || !container.contains(btn)) return;
    if (addToCart(findProduct(btn.dataset.id))) showToast("Added to cart");
  });
}
