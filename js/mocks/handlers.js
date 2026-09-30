/**
 * REST endpoints served by Mock Service Worker.
 *
 *   GET /api/restaurants
 *   GET /api/restaurants/:id          restaurant + its menu
 *   GET /api/menu                     filters: q, category, veg, minRating, maxPrice,
 *                                     sort, popular, restaurantId, ids (comma-separated)
 *   GET /api/categories               categories with item counts
 *
 * Paths start with "*" so they match when the site is served from a
 * sub-path (e.g. GitHub Pages at /FoodDelivery/).
 */
import { http, HttpResponse, delay } from "../vendor/msw.js";
import { getMockConfig, nextLatency } from "./config.js";
import { getAll, getById, STORES } from "./db.js";
import { queryMenu } from "../domain/menuQuery.js";

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

/** Attach a restaurant summary and category label to each menu item, like a SQL join. */
async function withRestaurant(items) {
  const [restaurants, categories] = await Promise.all([getAll(STORES.restaurants), getAll(STORES.categories)]);
  const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
  const labelById = new Map(categories.map((c) => [c.id, c.label]));
  return items.map(({ position, ...item }) => {
    const r = restaurantById.get(item.restaurantId);
    return {
      ...item,
      categoryLabel: labelById.get(item.category) ?? item.category,
      restaurant: r ? { id: r.id, name: r.name } : null,
    };
  });
}

const numberParam = (params, key) => {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

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
      const params = new URL(request.url).searchParams;
      const items = await withRestaurant(await getAll(STORES.menuItems));
      const results = queryMenu(items, {
        q: params.get("q") ?? "",
        category: params.get("category") || undefined,
        veg: params.get("veg") === "true",
        minRating: numberParam(params, "minRating"),
        maxPrice: numberParam(params, "maxPrice"),
        sort: params.get("sort") ?? "relevance",
        popular: params.get("popular") === "true",
        restaurantId: params.get("restaurantId") || undefined,
        ids: params.get("ids")?.split(",").filter(Boolean),
      });
      return HttpResponse.json(results);
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
