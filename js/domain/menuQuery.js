/**
 * Filtering, search ranking and sorting for menu items.
 * Runs inside the mock backend (the "server"); kept pure so it can be unit tested.
 */

const normalize = (text) => String(text ?? "").toLowerCase().trim();

/**
 * Relevance of an item for one search token; 0 means no match.
 * Title matches beat restaurant/category matches, which beat description matches.
 */
function tokenScore(item, token) {
  const title = normalize(item.title);
  let score = 0;
  if (title.startsWith(token)) score += 100;
  else if (title.split(/\s+/).some((word) => word.startsWith(token))) score += 60;
  else if (title.includes(token)) score += 40;
  if (normalize(item.restaurant?.name).includes(token)) score += 20;
  if (normalize(item.category).includes(token) || normalize(item.categoryLabel).includes(token)) score += 15;
  if (normalize(item.desc).includes(token)) score += 5;
  return score;
}

/** Every token must match somewhere; the item's score is the sum over tokens. */
export function searchScore(item, query) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(item, token);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

const COMPARATORS = {
  price_asc: (a, b) => a.item.price - b.item.price,
  price_desc: (a, b) => b.item.price - a.item.price,
  rating: (a, b) => (b.item.rating ?? 0) - (a.item.rating ?? 0),
  relevance: (a, b) => b.score - a.score,
};

/**
 * @param {object[]} items - menu items (with optional `restaurant` and `categoryLabel`)
 * @param {{ q?: string, category?: string, veg?: boolean, minRating?: number, maxPrice?: number,
 *           sort?: string, popular?: boolean, restaurantId?: string, ids?: string[] }} query
 */
export function queryMenu(items, query = {}) {
  const { q = "", category, veg, minRating = 0, maxPrice = 0, sort = "relevance", popular, restaurantId, ids } = query;
  const idSet = ids?.length ? new Set(ids) : null;

  const ranked = items
    .map((item, position) => ({ item, position, score: searchScore(item, q) }))
    .filter(({ item, score }) =>
      score > 0 &&
      (!category || item.category === category) &&
      (!veg || item.veg) &&
      (!minRating || (item.rating ?? 0) >= minRating) &&
      (!maxPrice || item.price <= maxPrice) &&
      (!popular || item.popular) &&
      (!restaurantId || item.restaurantId === restaurantId) &&
      (!idSet || idSet.has(item.id))
    );

  const compare = COMPARATORS[sort] ?? COMPARATORS.relevance;
  // Stable tie-break on original position keeps results predictable.
  ranked.sort((a, b) => compare(a, b) || a.position - b.position);
  return ranked.map(({ item }) => item);
}
