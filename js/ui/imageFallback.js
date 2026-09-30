/** Swap any image that fails to load for a branded placeholder. */

const FALLBACK_SRC =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#ffe9d6"/><text x="200" y="165" font-family="Poppins,sans-serif" font-size="36" font-weight="700" fill="#fc8019" text-anchor="middle">Foodie.</text></svg>`
  );

function applyFallback(img) {
  if (img.src !== FALLBACK_SRC) img.src = FALLBACK_SRC;
}

export function initImageFallback() {
  // "error" doesn't bubble, so listen in the capture phase to catch images rendered later.
  document.addEventListener(
    "error",
    (e) => {
      if (e.target instanceof HTMLImageElement) applyFallback(e.target);
    },
    true
  );

  // Static images may have already failed before this module ran.
  document.querySelectorAll("img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) applyFallback(img);
  });
}
