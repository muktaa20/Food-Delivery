/**
 * IndexedDB "database" behind the mock API.
 *
 * On first run (or when SEED_VERSION changes) the catalog is loaded from the
 * seed files. Handlers then read from IndexedDB, just as a real server reads
 * from its database, so data persists across reloads and later phases can
 * write to it (e.g. orders).
 */
import { RESTAURANTS } from "./data/restaurants.js";
import { MENU_ITEMS, CATEGORIES } from "./data/menu.js";

const DB_NAME = "foodie-mock-db";
const DB_VERSION = 1;
// Bump when seed data changes to reload the catalog for existing visitors.
const SEED_VERSION = 1;

export const STORES = Object.freeze({
  restaurants: "restaurants",
  menuItems: "menuItems",
  categories: "categories",
  meta: "meta",
});

const promisify = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });

let dbPromise;

function openDB() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(STORES.restaurants, { keyPath: "id" });
      const menu = db.createObjectStore(STORES.menuItems, { keyPath: "id" });
      menu.createIndex("byRestaurant", "restaurantId");
      menu.createIndex("byCategory", "category");
      db.createObjectStore(STORES.categories, { keyPath: "id" });
      db.createObjectStore(STORES.meta, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** IndexedDB returns records in key order ("p1", "p10", "p2"...), so keep the seed order explicitly. */
const withPosition = (records) => records.map((record, position) => ({ ...record, position }));

async function seed(db) {
  const catalogStores = [STORES.restaurants, STORES.menuItems, STORES.categories];
  const tx = db.transaction([...catalogStores, STORES.meta], "readwrite");
  catalogStores.forEach((name) => tx.objectStore(name).clear());
  withPosition(RESTAURANTS).forEach((r) => tx.objectStore(STORES.restaurants).put(r));
  withPosition(MENU_ITEMS).forEach((m) => tx.objectStore(STORES.menuItems).put(m));
  withPosition(CATEGORIES).forEach((c) => tx.objectStore(STORES.categories).put(c));
  tx.objectStore(STORES.meta).put({ key: "seedVersion", value: SEED_VERSION });
  await transactionDone(tx);
}

/** Open the database and load seed data if it's missing or outdated. */
export async function ensureSeeded() {
  const db = await openDB();
  const meta = await promisify(db.transaction(STORES.meta).objectStore(STORES.meta).get("seedVersion"));
  if (meta?.value !== SEED_VERSION) await seed(db);
}

/** All records in a store (optionally via an index), sorted by seed position. */
export async function getAll(storeName, { index, query } = {}) {
  const db = await openDB();
  const store = db.transaction(storeName).objectStore(storeName);
  const source = index ? store.index(index) : store;
  const records = await promisify(source.getAll(query));
  return records.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export async function getById(storeName, id) {
  const db = await openDB();
  return promisify(db.transaction(storeName).objectStore(storeName).get(id));
}
