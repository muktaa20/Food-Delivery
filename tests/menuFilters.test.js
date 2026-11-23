import { describe, it, expect } from "vitest";
import {
  DEFAULT_FILTERS,
  parseFilters,
  filtersToSearchParams,
  filtersToApiQuery,
  countActiveFilters,
} from "../js/domain/menuFilters.js";

describe("parseFilters", () => {
  it("returns defaults for an empty query string", () => {
    expect(parseFilters("")).toEqual(DEFAULT_FILTERS);
  });

  it("reads every supported parameter", () => {
    expect(parseFilters("?q=paneer&category=pizza&veg=1&rating=4.5&maxPrice=300&sort=price_asc")).toEqual({
      q: "paneer",
      category: "pizza",
      veg: true,
      minRating: 4.5,
      maxPrice: 300,
      sort: "price_asc",
    });
  });

  it("rejects invalid values instead of passing them through", () => {
    const f = parseFilters("?sort=hacker&rating=-3&maxPrice=abc&veg=yes");
    expect(f.sort).toBe("relevance");
    expect(f.minRating).toBe(0);
    expect(f.maxPrice).toBe(0);
    expect(f.veg).toBe(false);
  });

  it("clamps rating to 5 and trims the search text", () => {
    const f = parseFilters("?rating=9&q=%20%20biryani%20");
    expect(f.minRating).toBe(5);
    expect(f.q).toBe("biryani");
  });
});

describe("filtersToSearchParams", () => {
  it("omits defaults so URLs stay short", () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("round-trips through parseFilters", () => {
    const filters = { q: "chicken roll", category: "rolls", veg: false, minRating: 4, maxPrice: 200, sort: "rating" };
    expect(parseFilters(filtersToSearchParams(filters))).toEqual(filters);
  });
});

describe("filtersToApiQuery", () => {
  it("maps 'all' category and defaults to undefined", () => {
    expect(filtersToApiQuery(DEFAULT_FILTERS)).toEqual({
      q: undefined, category: undefined, veg: undefined, minRating: undefined, maxPrice: undefined, sort: undefined,
    });
  });
});

describe("countActiveFilters", () => {
  it("counts non-default filters, ignoring the search text", () => {
    expect(countActiveFilters({ ...DEFAULT_FILTERS, q: "x", veg: true, sort: "rating" })).toBe(2);
  });
});
