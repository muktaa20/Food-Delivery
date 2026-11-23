import { describe, it, expect } from "vitest";
import { queryMenu, searchScore } from "../js/domain/menuQuery.js";

const items = [
  { id: "a", title: "Paneer Tikka Pizza", desc: "Tandoori paneer", category: "pizza", categoryLabel: "Pizza", price: 259, rating: 4.3, veg: true, restaurant: { name: "Pizza Piazza" } },
  { id: "b", title: "Chicken Tikka Skewers", desc: "From the tandoor", category: "kebab", categoryLabel: "Kebabs", price: 239, rating: 4.5, veg: false, restaurant: { name: "Spice Route" } },
  { id: "c", title: "Paneer Tikka Roll", desc: "Grilled paneer", category: "rolls", categoryLabel: "Rolls", price: 119, rating: 4.2, veg: true, restaurant: { name: "Spice Route" } },
  { id: "d", title: "Margherita Pizza", desc: "Fresh mozzarella", category: "pizza", categoryLabel: "Pizza", price: 149, rating: 4.3, veg: true, popular: true, restaurant: { name: "Pizza Piazza" } },
];
const ids = (list) => list.map((i) => i.id);

describe("searchScore", () => {
  it("ranks title-prefix matches above other matches", () => {
    expect(searchScore(items[0], "paneer")).toBeGreaterThan(searchScore(items[1], "tandoor"));
  });

  it("requires every token to match", () => {
    expect(searchScore(items[0], "paneer pizza")).toBeGreaterThan(0);
    expect(searchScore(items[1], "paneer pizza")).toBe(0);
  });

  it("matches restaurant names and category labels", () => {
    expect(searchScore(items[1], "spice")).toBeGreaterThan(0);
    expect(searchScore(items[1], "kebabs")).toBeGreaterThan(0);
  });
});

describe("queryMenu", () => {
  it("returns everything in original order with no filters", () => {
    expect(ids(queryMenu(items))).toEqual(["a", "b", "c", "d"]);
  });

  it("is case-insensitive and ranks by relevance", () => {
    expect(ids(queryMenu(items, { q: "PIZZA" }))).toEqual(["a", "d"]);
    expect(ids(queryMenu(items, { q: "margh" }))).toEqual(["d"]);
  });

  it("combines search with filters", () => {
    expect(ids(queryMenu(items, { q: "tikka", veg: true }))).toEqual(["a", "c"]);
    expect(ids(queryMenu(items, { q: "tikka", maxPrice: 200 }))).toEqual(["c"]);
    expect(ids(queryMenu(items, { minRating: 4.4 }))).toEqual(["b"]);
    expect(ids(queryMenu(items, { category: "pizza", popular: true }))).toEqual(["d"]);
  });

  it("sorts by price and rating with a stable tie-break", () => {
    expect(ids(queryMenu(items, { sort: "price_asc" }))).toEqual(["c", "d", "b", "a"]);
    expect(ids(queryMenu(items, { sort: "price_desc" }))).toEqual(["a", "b", "d", "c"]);
    expect(ids(queryMenu(items, { sort: "rating" }))).toEqual(["b", "a", "d", "c"]);
  });

  it("filters by an explicit id list", () => {
    expect(ids(queryMenu(items, { ids: ["d", "b"] }))).toEqual(["b", "d"]);
  });
});
