import { describe, it, expect } from "vitest";
import {
  MAX_QTY_PER_ITEM,
  addItem,
  cartCount,
  emptyCart,
  migrateV1,
  normalizeCart,
  setItemQty,
} from "../js/domain/cart.js";

const burgerBarn = { id: "r1", name: "Burger Barn" };
const pizzaPiazza = { id: "r2", name: "Pizza Piazza" };
const burger = { id: "p1", restaurant: burgerBarn };
const fries = { id: "p5", restaurant: burgerBarn };
const pizza = { id: "p2", restaurant: pizzaPiazza };

describe("addItem", () => {
  it("adds to an empty cart and remembers the restaurant", () => {
    const { cart, conflict } = addItem(emptyCart(), burger);
    expect(conflict).toBe(false);
    expect(cart).toEqual({ restaurant: burgerBarn, items: { p1: 1 } });
  });

  it("increments existing lines and accepts dishes from the same restaurant", () => {
    let { cart } = addItem(emptyCart(), burger);
    ({ cart } = addItem(cart, burger));
    ({ cart } = addItem(cart, fries, 2));
    expect(cart.items).toEqual({ p1: 2, p5: 2 });
    expect(cartCount(cart)).toBe(4);
  });

  it("reports a conflict for another restaurant and leaves the cart unchanged", () => {
    const { cart } = addItem(emptyCart(), burger);
    const result = addItem(cart, pizza);
    expect(result.conflict).toBe(true);
    expect(result.cart).toBe(cart);
  });

  it("does not mutate the input cart", () => {
    const original = addItem(emptyCart(), burger).cart;
    const snapshot = structuredClone(original);
    addItem(original, fries);
    expect(original).toEqual(snapshot);
  });

  it("fills in the restaurant for a migrated cart", () => {
    const migrated = { restaurant: null, items: { p1: 1 } };
    expect(addItem(migrated, fries).cart.restaurant).toEqual(burgerBarn);
  });
});

describe("setItemQty", () => {
  it("clamps to the per-item maximum", () => {
    const { cart } = addItem(emptyCart(), burger);
    expect(setItemQty(cart, "p1", 99).items.p1).toBe(MAX_QTY_PER_ITEM);
  });

  it("removes the line at 0 and forgets the restaurant when the cart empties", () => {
    const { cart } = addItem(emptyCart(), burger);
    expect(setItemQty(cart, "p1", 0)).toEqual(emptyCart());
  });
});

describe("migrateV1 / normalizeCart", () => {
  it("converts v1 snapshots to ids and quantities", () => {
    const v1 = {
      p1: { id: "p1", title: "Cheese Burger", price: 49, img: "x.jpg", qty: 2 },
      p3: { id: "p3", title: "Veg Noodles", price: 99, img: "y.jpg", qty: "1" },
      bad: { title: "no id", qty: 1 },
    };
    expect(migrateV1(v1)).toEqual({ restaurant: null, items: { p1: 2, p3: 1 } });
  });

  it("repairs malformed stored data", () => {
    expect(normalizeCart(null)).toEqual(emptyCart());
    expect(normalizeCart({ items: "nope" })).toEqual(emptyCart());
    expect(normalizeCart({ restaurant: burgerBarn, items: { p1: -3, p5: 2.7, p6: "abc" } })).toEqual({
      restaurant: burgerBarn,
      items: { p5: 2 },
    });
  });
});
