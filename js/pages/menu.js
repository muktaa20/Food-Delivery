/**
 * Menu page: live search, filters and sorting, all mirrored in the URL.
 *
 * Flow: a control changes -> `filters` is updated -> the URL is written
 * (pushState for discrete choices, replaceState while typing) -> the menu is
 * re-fetched. Back/forward fire `popstate`, which re-reads the URL and
 * re-syncs the controls, so every filtered view is linkable and restorable.
 */
import { $, $$ } from "../utils/dom.js";
import { escapeHtml } from "../utils/format.js";
import { debounce } from "../utils/debounce.js";
import { api, isAbortError } from "../services/api.js";
import { getRecentSearches, saveRecentSearch } from "../services/recentSearches.js";
import {
  DEFAULT_FILTERS,
  parseFilters,
  filtersToSearchParams,
  filtersToApiQuery,
  countActiveFilters,
} from "../domain/menuFilters.js";
import { renderProductCards } from "../ui/productCard.js";
import { bindCartControls } from "../ui/cartControls.js";
import { GUEST_MENU_LIMIT, isLoggedIn, loginPromptHTML } from "../services/authGate.js";
import { renderLoading, renderError, renderEmpty } from "../ui/states.js";

const SEARCH_DEBOUNCE_MS = 300;

export function init() {
  const grid = $("#menu-grid");
  const chips = $(".filters");
  if (!grid || !chips) return;

  const controls = {
    search: $("#menu-search"),
    recent: $("#recent-searches"),
    veg: $("#filter-veg"),
    rating: $("#filter-rating"),
    price: $("#filter-price"),
    sort: $("#sort-by"),
    summary: $("#results-summary"),
    clear: $("#clear-filters"),
  };

  const productsById = new Map();
  let filters = parseFilters(location.search);
  let categoriesLoaded = false;
  let inFlight = null;
  let lastResultCount = 0;

  /* ---------- URL <-> state ---------- */

  function writeUrl({ replace = false } = {}) {
    const query = filtersToSearchParams(filters).toString();
    const url = `${location.pathname}${query ? `?${query}` : ""}`;
    if (url === `${location.pathname}${location.search}`) return;
    history[replace ? "replaceState" : "pushState"](null, "", url);
  }

  function syncControls() {
    if (controls.search.value !== filters.q) controls.search.value = filters.q;
    controls.veg.checked = filters.veg;
    controls.rating.value = String(filters.minRating);
    controls.price.value = String(filters.maxPrice);
    controls.sort.value = filters.sort;
    // Values that came from a hand-edited URL but aren't in a <select> fall back to its first option.
    if (controls.rating.selectedIndex === -1) controls.rating.selectedIndex = 0;
    if (controls.price.selectedIndex === -1) controls.price.selectedIndex = 0;
    $$(".filter-btn", chips).forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.cat === filters.category));
    });
    controls.clear.hidden = countActiveFilters(filters) === 0 && !filters.q;
  }

  function update(changes, { replace = false, debounced = false } = {}) {
    filters = { ...filters, ...changes };
    writeUrl({ replace });
    syncControls();
    if (debounced) {
      debouncedLoad();
    } else {
      debouncedLoad.cancel();
      loadMenu();
    }
  }

  /* ---------- Data ---------- */

  function renderRecentSearches() {
    controls.recent.innerHTML = getRecentSearches()
      .map((q) => `<option value="${escapeHtml(q)}"></option>`)
      .join("");
  }

  function renderSummary(count) {
    const noun = count === 1 ? "dish" : "dishes";
    controls.summary.innerHTML = filters.q
      ? `${count} ${noun} matching “<strong>${escapeHtml(filters.q)}</strong>”`
      : `${count} ${noun}`;
  }

  async function loadCategories() {
    try {
      const categories = await api.getCategories();
      const html = categories
        .filter((c) => c.count > 0)
        .map(
          (c) =>
            `<button type="button" class="btn filter-btn" data-cat="${escapeHtml(c.id)}">${escapeHtml(c.label)} <span class="chip-count">${c.count}</span></button>`
        )
        .join("");
      chips.insertAdjacentHTML("beforeend", html);
      categoriesLoaded = true;
      syncControls();
    } catch (err) {
      // Non-critical: the "All" chip still works, and retrying the menu retries this too.
      console.warn("Could not load categories", err);
    }
  }

  const PAGE_SIZE = 24;
  let currentItems = [];
  let shown = PAGE_SIZE;
  const moreBtn = document.createElement("button");
  moreBtn.type = "button";
  moreBtn.className = "btn show-more";
  grid.after(moreBtn);
  moreBtn.hidden = true;
  moreBtn.addEventListener("click", () => {
    shown += PAGE_SIZE;
    renderPage();
  });

  const gate = document.createElement("div");
  moreBtn.after(gate);

  function renderPage() {
    const member = isLoggedIn();
    if (!member) shown = Math.min(shown, GUEST_MENU_LIMIT);
    renderProductCards(grid, currentItems.slice(0, shown), { variant: "menu", query: filters.q });
    const left = currentItems.length - shown;

    // Guests get a preview; the rest of the catalog is behind sign-in.
    const locked = !member && left > 0;
    gate.innerHTML = locked
      ? loginPromptHTML({
          title: `${left} more dishes are waiting`,
          text: "Sign in or create a free account to see the full menu, order and track deliveries.",
        })
      : "";
    moreBtn.hidden = locked || left <= 0;
    moreBtn.textContent = `Show more (${left} left)`;
  }

  /** A newer load aborts the in-flight one, so a slow stale response can't overwrite fresh results. */
  async function loadMenu() {
    inFlight?.abort();
    inFlight = new AbortController();
    const { signal } = inFlight;

    renderLoading(grid, 8);
    moreBtn.hidden = true;
    gate.innerHTML = "";
    controls.summary.textContent = "Searching…";
    try {
      const items = await api.getMenu(filtersToApiQuery(filters), { signal });
      items.forEach((item) => productsById.set(item.id, item));
      lastResultCount = items.length;
      renderSummary(items.length);

      if (items.length > 0) {
        currentItems = items;
        shown = PAGE_SIZE;
        renderPage();
      } else {
        const hasFilters = countActiveFilters(filters) > 0 || filters.q;
        renderEmpty(
          grid,
          filters.q ? `No dishes match “${filters.q}”. Try another dish or cuisine.` : "No dishes match these filters.",
          hasFilters ? { label: "Clear all filters", onClick: resetFilters } : undefined
        );
      }
    } catch (err) {
      if (isAbortError(err)) return;
      controls.summary.textContent = "";
      renderError(grid, err.message, () => {
        if (!categoriesLoaded) loadCategories();
        loadMenu();
      });
    }
  }

  const debouncedLoad = debounce(loadMenu, SEARCH_DEBOUNCE_MS);

  function resetFilters() {
    update({ ...DEFAULT_FILTERS });
  }

  function commitSearch() {
    if (filters.q && lastResultCount > 0) {
      saveRecentSearch(filters.q);
      renderRecentSearches();
    }
  }

  /* ---------- Events ---------- */

  controls.search.addEventListener("input", () => {
    update({ q: controls.search.value.trim() }, { replace: true, debounced: true });
  });
  controls.search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      debouncedLoad.flush();
      commitSearch();
    } else if (e.key === "Escape" && controls.search.value) {
      e.stopPropagation();
      controls.search.value = "";
      update({ q: "" }, { replace: true });
    }
  });
  controls.search.addEventListener("change", commitSearch);

  controls.veg.addEventListener("change", () => update({ veg: controls.veg.checked }));
  controls.rating.addEventListener("change", () => update({ minRating: Number(controls.rating.value) }));
  controls.price.addEventListener("change", () => update({ maxPrice: Number(controls.price.value) }));
  controls.sort.addEventListener("change", () => update({ sort: controls.sort.value }));
  controls.clear.addEventListener("click", resetFilters);

  chips.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (btn && btn.dataset.cat !== filters.category) update({ category: btn.dataset.cat });
  });

  // "/" focuses search from anywhere on the page, unless the user is already typing.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.target.closest("input, textarea, select")) return;
    e.preventDefault();
    controls.search.focus();
  });

  window.addEventListener("popstate", () => {
    filters = parseFilters(location.search);
    syncControls();
    debouncedLoad.cancel();
    loadMenu();
  });

  bindCartControls(grid, (id) => productsById.get(id));
  renderRecentSearches();
  syncControls();
  loadCategories();
  loadMenu();
}
