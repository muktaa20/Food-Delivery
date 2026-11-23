import { describe, it, expect } from "vitest";
import { buildRoute, haversine, offsetPoint, pointAlongRoute, routeLength, routeUntil } from "../js/domain/geo.js";
import { getOrderProgress } from "../js/domain/orderStatus.js";
import { buildOrder, OrderError, withProgress } from "../js/mocks/orders.js";
import { COUPONS } from "../js/mocks/data/coupons.js";

const PUNE = [18.5204, 73.8567];

describe("geo", () => {
  it("offsets a point by a distance and bearing", () => {
    const north = offsetPoint(PUNE, 1000, 0);
    expect(haversine(PUNE, north)).toBeCloseTo(1000, -1);
    expect(north[0]).toBeGreaterThan(PUNE[0]);
  });

  it("builds a deterministic route that starts and ends at the endpoints", () => {
    const to = offsetPoint(PUNE, 2500, 45);
    const a = buildRoute(PUNE, to, 42);
    expect(a[0]).toEqual(PUNE);
    expect(a.at(-1)).toEqual(to);
    expect(buildRoute(PUNE, to, 42)).toEqual(a);
    expect(buildRoute(PUNE, to, 7)).not.toEqual(a);
    expect(routeLength(a)).toBeGreaterThan(haversine(PUNE, to));
  });

  it("interpolates positions along the route", () => {
    const route = [PUNE, offsetPoint(PUNE, 1000, 90)];
    expect(pointAlongRoute(route, 0)).toEqual(route[0]);
    expect(pointAlongRoute(route, 1)).toEqual(route[1]);
    expect(haversine(route[0], pointAlongRoute(route, 0.5))).toBeCloseTo(500, -1);
    expect(routeUntil(route, 0.5)).toHaveLength(2);
  });
});

describe("getOrderProgress", () => {
  const createdAt = "2026-09-30T12:00:00.000Z";
  const at = (seconds) => new Date(Date.parse(createdAt) + seconds * 1000);
  const route = [PUNE, offsetPoint(PUNE, 2000, 90)];

  it("walks through the stages over time", () => {
    const order = { createdAt, route };
    expect(getOrderProgress(order, at(0)).status).toBe("PLACED");
    expect(getOrderProgress(order, at(15)).status).toBe("CONFIRMED");
    expect(getOrderProgress(order, at(45)).status).toBe("PREPARING");
    expect(getOrderProgress(order, at(100)).status).toBe("OUT_FOR_DELIVERY");
    const done = getOrderProgress(order, at(300));
    expect(done).toMatchObject({ status: "DELIVERED", delivered: true, etaSeconds: 0, riderProgress: 1 });
    expect(done.timeline.every((s) => s.reached)).toBe(true);
  });

  it("moves the rider only after pickup", () => {
    const order = { createdAt, route };
    expect(getOrderProgress(order, at(60)).riderProgress).toBe(0);
    expect(getOrderProgress(order, at(150)).riderProgress).toBeCloseTo(0.5);
    expect(getOrderProgress(order, at(150)).etaSeconds).toBe(60);
  });

  it("respects timeScale (demo speed)", () => {
    const fast = { createdAt, route, timeScale: 0.1 };
    expect(getOrderProgress(fast, at(10)).status).toBe("OUT_FOR_DELIVERY");
    expect(getOrderProgress(fast, at(21)).status).toBe("DELIVERED");
    expect(getOrderProgress(fast, at(0)).etaSeconds).toBe(21);
  });
});

describe("buildOrder (mock server)", () => {
  const restaurant = { id: "r1", name: "Burger Barn" };
  const menuById = new Map([
    ["p1", { id: "p1", title: "Cheese Burger", price: 49, veg: true, restaurant }],
    ["p8", { id: "p8", title: "Fried Chicken Bucket", price: 379, veg: false, restaurant }],
    ["p2", { id: "p2", title: "Pepperoni Pizza", price: 199, veg: false, restaurant: { id: "r2", name: "Pizza Piazza" } }],
  ]);
  const address = { name: "Asha", phone: "+91 98765 43210", flat: "12B", area: "FC Road", city: "Pune", pincode: "411004" };
  const base = { items: [{ id: "p1", qty: 2 }, { id: "p8", qty: 1 }], address, payment: { method: "cod" }, tip: 20 };
  const build = (body, extra = {}) =>
    buildOrder({ body: { ...base, ...body }, menuById, coupons: COUPONS, isFirstOrder: true, speed: 1, ...extra });

  it("prices on the server, ignoring any client-side prices", () => {
    const order = build({ items: [{ id: "p1", qty: 2, price: 1 }] });
    expect(order.pricing.subtotal).toBe(98);
    expect(order.items[0]).toEqual({ id: "p1", title: "Cheese Burger", price: 49, qty: 2, veg: true });
    expect(order.customer.phone).toBe("9876543210");
  });

  it("applies a valid coupon and rejects an invalid one", () => {
    expect(build({ couponCode: "WELCOME50" }).pricing.discount).toBe(100);
    expect(() => build({ couponCode: "WELCOME50" }, { isFirstOrder: false })).toThrow(/first order/);
    expect(() => build({ couponCode: "NOPE" })).toThrow(OrderError);
  });

  it("rejects stale totals, unknown dishes and mixed restaurants", () => {
    expect(() => build({ expectedTotal: 1 })).toThrow(/Prices changed/);
    expect(() => build({ items: [{ id: "zzz", qty: 1 }] })).toThrow(/no longer available/);
    expect(() => build({ items: [{ id: "p1", qty: 1 }, { id: "p2", qty: 1 }] })).toThrow(/same restaurant/);
  });

  it("stores only the card brand and last 4 digits", () => {
    const order = build({ payment: { method: "card", brand: "visa", last4: "1111", number: "4111111111111111" } });
    expect(order.payment).toEqual({ method: "card", brand: "visa", last4: "1111", label: "Visa •••• 1111", paid: true });
  });

  it("generates a route from a nearby branch to the customer's pin", () => {
    const pin = [18.53, 73.84];
    const order = build({ location: pin }, { speed: 10 });
    expect(order.customer.location).toEqual(pin);
    expect(order.route.at(-1)).toEqual(pin);
    const distance = haversine(order.restaurant.location, pin);
    expect(distance).toBeGreaterThan(1700);
    expect(distance).toBeLessThan(3100);
    expect(order.timeScale).toBeCloseTo(0.1);
  });

  it("hides the idempotency key from API responses", () => {
    const order = build({}, { idempotencyKey: "abc" });
    expect(order.idempotencyKey).toBe("abc");
    const response = withProgress(order);
    expect(response.idempotencyKey).toBeUndefined();
    expect(response.progress.status).toBe("PLACED");
  });
});
