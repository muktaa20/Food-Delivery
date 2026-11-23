/** Integers print as-is; fractional amounts are fixed to 2 decimals. */
export function formatNumber(n) {
  const num = Number(n);
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

export const formatPrice = (n) => `₹${formatNumber(n)}`;

/** Escape a value for safe interpolation into HTML strings. */
export function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
