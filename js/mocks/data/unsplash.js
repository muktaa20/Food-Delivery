/**
 * Catalog photos are hot-linked from the Unsplash CDN (free to use under the
 * Unsplash License, https://unsplash.com/license). Cropped server-side to the
 * 4:3 card ratio so cards don't download full-size originals.
 */
export function unsplash(photoId, { w = 800, h = 600 } = {}) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=85`;
}
