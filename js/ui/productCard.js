/**
 * Product card rendering. Cart buttons come from ui/cartControls.js.
 */
import { escapeHtml, formatPrice } from "../utils/format.js";
import { highlightMatches } from "../utils/highlight.js";
import { doneLoading } from "./states.js";
import { cartControlHTML } from "./cartControls.js";

function vegBadgeHTML(veg) {
  const label = veg ? "Veg" : "Non-veg";
  return `<span class="veg-badge ${veg ? "veg" : "non-veg"}" title="${label}" aria-label="${label}"></span>`;
}

/**
 * @param {object} product - a menu item from the API
 * @param {{ variant?: "home" | "menu", query?: string }} [options]
 *   "home" is the compact card with a View link; "menu" adds the description and a Go to Cart link.
 *   `query` highlights matching text in the title and restaurant name.
 */
export function productCardHTML(product, { variant = "menu", query = "" } = {}) {
  const title = escapeHtml(product.title);
  const addButton = cartControlHTML(product);

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
      <h4>${highlightMatches(product.title, query)}</h4>
      ${product.restaurant ? `<p class="card-restaurant">${highlightMatches(product.restaurant.name, query)}</p>` : ""}
      <div class="price">${formatPrice(product.price)}</div>
      ${body}
    </div>
  `;
}

export function renderProductCards(container, products, options) {
  container.innerHTML = products.map((p) => productCardHTML(p, options)).join("");
  doneLoading(container);
}