import { escapeHtml } from "./format.js";

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Escape `text` for HTML and wrap each occurrence of any query token in <mark>.
 * Matching runs on the raw text and each piece is escaped separately, so a
 * query can never inject markup.
 */
export function highlightMatches(text, query) {
  const raw = String(text ?? "");
  const tokens = String(query ?? "").trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (tokens.length === 0) return escapeHtml(raw);

  const pattern = new RegExp(`(${tokens.join("|")})`, "gi");
  return raw
    .split(pattern)
    .map((part, i) => (i % 2 === 1 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join("");
}
