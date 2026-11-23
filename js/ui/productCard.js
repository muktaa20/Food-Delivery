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

  const desc = variant === "menu" && product.desc ? `<p class="card-desc">${escapeHtml(product.desc)}</p>` : "";
  const rating = product.rating
    ? `<span class="rating"><i class="fa-solid fa-star" aria-hidden="true"></i> ${product.rating.toFixed(1)}</span>`
    : "";

  return `
    <article class="order-card">
      <div class="card-media">
        <img src="${escapeHtml(product.img)}" alt="${title}" loading="lazy" />
        ${rating}
      </div>
      <div class="card-body">
        <div class="card-title-row">
          ${vegBadgeHTML(product.veg)}
          <h4>${highlightMatches(product.title, query)}</h4>
        </div>
        ${product.restaurant ? `<p class="card-restaurant">${highlightMatches(product.restaurant.name, query)}</p>` : ""}
        ${desc}
        <div class="card-actions">
          <span class="price">${formatPrice(product.price)}</span>
          ${addButton}
        </div>
      </div>
    </article>
  `;
}

export function renderProductCards(container, products, options) {
  container.innerHTML = products.map((p) => productCardHTML(p, options)).join("");
  doneLoading(container);
}