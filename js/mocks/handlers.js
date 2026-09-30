/**
 * REST endpoints served by Mock Service Worker.
 *
 *   GET /api/restaurants
 *   GET /api/restaurants/:id          restaurant + its menu
 *   GET /api/menu?category=&popular=true&restaurantId=
 *   GET /api/categories               categories with item counts
 *
 * Paths start with "*" so they match when the site is served from a
 * sub-path (e.g. GitHub Pages at /FoodDelivery/).
 */
import { http, HttpResponse, delay } from "../vendor/msw.js";
import { getMockConfig, nextLatency } from "./config.js";
import { getAll, getById, STORES } from "./db.js";

const notFound = (message) => HttpResponse.json({ message }, { status: 404 });

/** Wrap a resolver with simulated latency and random server failures. */
const withNetwork = (resolver) => async (info) => {
  await delay(nextLatency());
  if (Math.random() < getMockConfig().errorRate) {
    return HttpResponse.json(
      { message: "Our kitchen server hiccuped (simulated error). Please try again." },
      { status: 500 }
    );
  }
  return resolver(info);
};

/** Attach a small restaurant summary to each menu item, like a SQL join. */
async function withRestaurant(items) {
  const restaurants = new Map((await getAll(STORES.restaurants)).map((r) => [r.id, r]));
  return items.map(({ position, ...item }) => {
    const r = restaurants.get(item.restaurantId);
    return { ...item, restaurant: r ? { id: r.id, name: r.name } : null };
  });
}

const stripPosition = ({ position, ...rest }) => rest;

export const handlers = [
  http.get(
    "*/api/restaurants",
    withNetwork(async () => HttpResponse.json((await getAll(STORES.restaurants)).map(stripPosition)))
  ),

  http.get(
    "*/api/restaurants/:id",
    withNetwork(async ({ params }) => {
      const restaurant = await getById(STORES.restaurants, params.id);
      if (!restaurant) return notFound(`Restaurant "${params.id}" not found.`);
      const menu = await getAll(STORES.menuItems, { index: "byRestaurant", query: params.id });
      return HttpResponse.json({ ...stripPosition(restaurant), menu: await withRestaurant(menu) });
    })
  ),

  http.get(
    "*/api/menu",
    withNetwork(async ({ request }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get("category");
      const restaurantId = url.searchParams.get("restaurantId");
      const popularOnly = url.searchParams.get("popular") === "true";

      let items = category
        ? await getAll(STORES.menuItems, { index: "byCategory", query: category })
        : await getAll(STORES.menuItems);
      if (restaurantId) items = items.filter((item) => item.restaurantId === restaurantId);
      if (popularOnly) items = items.filter((item) => item.popular);

      return HttpResponse.json(await withRestaurant(items));
    })
  ),

  http.get(
    "*/api/categories",
    withNetwork(async () => {
      const [categories, items] = await Promise.all([getAll(STORES.categories), getAll(STORES.menuItems)]);
      const counts = items.reduce((acc, item) => acc.set(item.category, (acc.get(item.category) ?? 0) + 1), new Map());
      return HttpResponse.json(
        categories.map((c) => ({ ...stripPosition(c), count: counts.get(c.id) ?? 0 }))
      );
    })
  ),
];
