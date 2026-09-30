/**
 * Cart rules as pure functions (no storage, no DOM), so they're unit-testable.
 *
 * Cart v2 shape:
 *   { restaurant: { id, name } | null, items: { [productId]: qty } }
 *
 * Only ids and quantities are stored. Titles and prices come from the API when
 * the cart is shown, so a price change on the "server" is always reflected and
 * the total can't be tampered with in localStorage.
 *
 * Like most delivery apps, a cart holds dishes from one restaurant at a time.
 */

export const MAX_QTY_PER_ITEM = 20;

export const emptyCart = () => ({ restaurant: null, items: {} });

const toQty = (value) => {
  const qty = Math.floor(Number(value));
  return Number.isFinite(qty) ? Math.min(MAX_QTY_PER_ITEM, Math.max(0, qty)) : 0;
};

/** Validate data read from storage; anything malformed becomes an empty cart. */
export function normalizeCart(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.items !== "object" || raw.items === null) return emptyCart();
  const items = {};
  Object.entries(raw.items).forEach(([id, qty]) => {
    const clean = toQty(qty);
    if (clean > 0) items[id] = clean;
  });
  const restaurant =
    raw.restaurant && typeof raw.restaurant.id === "string"
      ? { id: raw.restaurant.id, name: String(raw.restaurant.name ?? "") }
      : null;
  return { restaurant: Object.keys(items).length ? restaurant : null, items };
}

/**
 * Convert a v1 cart ({ [id]: { id, title, price, img, qty } }) to v2.
 * v1 didn't record restaurants, so the restaurant is filled in the next time
 * a dish is added or the cart is priced.
 */
export function migrateV1(v1) {
  if (!v1 || typeof v1 !== "object") return emptyCart();
  const items = {};
  Object.values(v1).forEach((line) => {
    const qty = toQty(line?.qty);
    if (line?.id && qty > 0) items[line.id] = qty;
  });
  return { restaurant: null, items };
}

export const cartCount = (cart) => Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);

export const cartIds = (cart) => Object.keys(cart.items);

export const isCartEmpty = (cart) => cartIds(cart).length === 0;

/**
 * @param {{ id: string, restaurant?: { id: string, name: string } }} product
 * @returns {{ cart: object, conflict: boolean }} `conflict` means the product
 *   is from a different restaurant and the cart was left unchanged.
 */
export function addItem(cart, product, qty = 1) {
  const incoming = product.restaurant ?? null;
  if (cart.restaurant && incoming && cart.restaurant.id !== incoming.id && !isCartEmpty(cart)) {
    return { cart, conflict: true };
  }
  const next = setItemQty(cart, product.id, (cart.items[product.id] ?? 0) + qty);
  if (!next.restaurant && incoming && !isCartEmpty(next)) next.restaurant = { id: incoming.id, name: incoming.name };
  return { cart: next, conflict: false };
}

/** Set a line's quantity (clamped to 0..MAX); 0 removes it. An emptied cart forgets its restaurant. */
export function setItemQty(cart, id, qty) {
  const items = { ...cart.items };
  const clean = toQty(qty);
  if (clean > 0) items[id] = clean;
  else delete items[id];
  return { restaurant: Object.keys(items).length ? cart.restaurant : null, items };
}
