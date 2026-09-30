/** Menu page: full product grid with category filters. */
import { $ } from "../utils/dom.js";
import { getProductsByCategory } from "../data/products.js";
import { renderProductCards, bindAddToCart } from "../ui/productCard.js";

export function init() {
  const grid = $("#menu-grid");
  if (!grid) return;

  const render = (category) =>
    renderProductCards(grid, getProductsByCategory(category), { variant: "menu" });

  bindAddToCart(grid);
  render("all");

  $(".filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (btn) render(btn.dataset.cat);
  });
}
