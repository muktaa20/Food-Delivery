/**
 * Menu filter state <-> URL query string.
 * The URL is the source of truth for filters, so any filtered view can be
 * bookmarked, shared, or restored with the browser's back/forward buttons.
 */

export const SORT_OPTIONS = Object.freeze(["relevance", "price_asc", "price_desc", "rating"]);

export const DEFAULT_FILTERS = Object.freeze({
  q: "",
  category: "all",
  veg: false,
  minRating: 0,
  maxPrice: 0, // 0 = no limit
  sort: "relevance",
});

const toNonNegativeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

/** @param {string | URLSearchParams} search - e.g. location.search */
export function parseFilters(search) {
  const params = new URLSearchParams(search);
  const sort = params.get("sort");
  return {
    q: (params.get("q") ?? "").trim().slice(0, 100),
    category: params.get("category") || DEFAULT_FILTERS.category,
    veg: params.get("veg") === "1",
    minRating: Math.min(5, toNonNegativeNumber(params.get("rating"))),
    maxPrice: toNonNegativeNumber(params.get("maxPrice")),
    sort: SORT_OPTIONS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

/** Only non-default values are written, which keeps URLs short. */
export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category !== DEFAULT_FILTERS.category) params.set("category", filters.category);
  if (filters.veg) params.set("veg", "1");
  if (filters.minRating) params.set("rating", String(filters.minRating));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  return params;
}

/** Shape expected by `api.getMenu()`; empty values are dropped by the API client. */
export function filtersToApiQuery(filters) {
  return {
    q: filters.q || undefined,
    category: filters.category === "all" ? undefined : filters.category,
    veg: filters.veg || undefined,
    minRating: filters.minRating || undefined,
    maxPrice: filters.maxPrice || undefined,
    sort: filters.sort === DEFAULT_FILTERS.sort ? undefined : filters.sort,
  };
}

/** Number of active filters besides the text search (used for the "Clear filters" affordance). */
export function countActiveFilters(filters) {
  return ["category", "veg", "minRating", "maxPrice", "sort"].filter(
    (key) => filters[key] !== DEFAULT_FILTERS[key]
  ).length;
}
