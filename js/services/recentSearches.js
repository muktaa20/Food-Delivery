/** Last few committed searches, most recent first, for the search box suggestions. */
import { KEYS, readJSON, writeJSON } from "./storage.js";

const MAX_ENTRIES = 5;

export function getRecentSearches() {
  const list = readJSON(KEYS.recentSearches, []);
  return Array.isArray(list) ? list : [];
}

export function saveRecentSearch(query) {
  const q = query.trim();
  if (q.length < 2) return;
  const rest = getRecentSearches().filter((item) => item.toLowerCase() !== q.toLowerCase());
  writeJSON(KEYS.recentSearches, [q, ...rest].slice(0, MAX_ENTRIES));
}
