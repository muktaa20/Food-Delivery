/** Menu page: product grid loaded from the API, with category filter chips. */
import { $, $$ } from "../utils/dom.js";
import { escapeHtml } from "../utils/format.js";
import { api, isAbortError } from "../services/api.js";
import { renderProductCards, bindAddToCart } from "../ui/productCard.js";
import { renderLoading, renderError, renderEmpty } from "../ui/states.js";

export function init() {
  const grid = $("#menu-grid");
  const filters = $(".filters");
  if (!grid || !filters) return;

  const productsById = new Map();
  let activeCategory = "all";
  let categoriesLoaded = false;
  let inFlight = null;

  function setActiveChip() {
    $$(".filter-btn", filters).forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.cat === activeCategory));
    });
  }

  async function loadCategories() {
    try {
      const categories = await api.getCategories();
      const chips = categories
        .filter((c) => c.count > 0)
        .map(
          (c) =>
            `<button type="button" class="btn filter-btn" data-cat="${escapeHtml(c.id)}">${escapeHtml(c.label)} <span class="chip-count">${c.count}</span></button>`
        )
        .join("");
      filters.insertAdjacentHTML("beforeend", chips);
      categoriesLoaded = true;
      setActiveChip();
    } catch (err) {
      // Non-critical: the "All" chip still works, and retrying the menu retries this too.
      console.warn("Could not load categories", err);
    }
  }

  /** Switching category mid-request aborts the stale request, so an older response can't overwrite a newer one. */
  async function loadMenu() {
    inFlight?.abort();
    inFlight = new AbortController();
    const { signal } = inFlight;

    renderLoading(grid, 8);
    try {
      const category = activeCategory === "all" ? undefined : activeCategory;
      const items = await api.getMenu({ category }, { signal });
      items.forEach((item) => productsById.set(item.id, item));
      if (items.length === 0) renderEmpty(grid, "No dishes in this category yet.");
      else renderProductCards(grid, items, { variant: "menu" });
    } catch (err) {
      if (isAbortError(err)) return;
      renderError(grid, err.message, () => {
        if (!categoriesLoaded) loadCategories();
        loadMenu();
      });
    }
  }

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn || btn.dataset.cat === activeCategory) return;
    activeCategory = btn.dataset.cat;
    setActiveChip();
    loadMenu();
  });

  bindAddToCart(grid, (id) => productsById.get(id));
  setActiveChip();
  loadCategories();
  loadMenu();
}
