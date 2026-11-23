/**
 * Small geo toolkit for the simulated delivery: distances, offsets and a
 * street-like route between the restaurant and the customer.
 * Points are [lat, lng] arrays, the format Leaflet accepts directly.
 */

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const round6 = (n) => Math.round(n * 1e6) / 1e6;

/** Pune city centre; used when the customer doesn't share their location. */
export const DEFAULT_CITY_CENTER = Object.freeze([18.5204, 73.8567]);

export const isLatLng = (p) =>
  Array.isArray(p) && p.length === 2 && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180 && p.every(Number.isFinite);

/** Great-circle distance in metres. */
export function haversine([lat1, lng1], [lat2, lng2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** The point `distance` metres from `origin` along compass `bearing` (degrees). */
export function offsetPoint([lat, lng], distance, bearing) {
  const angular = distance / EARTH_RADIUS_M;
  const heading = toRad(bearing);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(heading));
  const lng2 =
    lng1 +
    Math.atan2(Math.sin(heading) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
  return [round6(toDeg(lat2)), round6(toDeg(lng2))];
}

/** Stable 32-bit hash, so the same order always gets the same route. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded PRNG (mulberry32) returning floats in [0, 1). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A deterministic, street-like path: jittered waypoints along the straight
 * line, joined by L-shaped legs (north/south, then east/west) like city blocks.
 */
export function buildRoute(from, to, seed, { waypoints = 4 } = {}) {
  const rand = seededRandom(seed);
  const points = [from];
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];
  const wobble = 0.25 * Math.max(Math.abs(dLat), Math.abs(dLng));

  let prev = from;
  for (let i = 1; i <= waypoints + 1; i++) {
    const t = i / (waypoints + 1);
    const next =
      i <= waypoints
        ? [
            round6(from[0] + dLat * t + (rand() - 0.5) * wobble),
            round6(from[1] + dLng * t + (rand() - 0.5) * wobble),
          ]
        : to;
    // Corner: go vertical first on even legs, horizontal first on odd ones.
    const corner = i % 2 === 0 ? [next[0], prev[1]] : [prev[0], next[1]];
    points.push(corner, next);
    prev = next;
  }
  return points;
}

export function routeLength(route) {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += haversine(route[i - 1], route[i]);
  return total;
}

/** Position at `fraction` (0..1) of the route's length, interpolated within a segment. */
export function pointAlongRoute(route, fraction) {
  if (route.length === 0) return null;
  const f = Math.min(1, Math.max(0, fraction));
  if (f === 0 || route.length === 1) return route[0];
  if (f === 1) return route[route.length - 1];

  const target = routeLength(route) * f;
  let travelled = 0;
  for (let i = 1; i < route.length; i++) {
    const segment = haversine(route[i - 1], route[i]);
    if (travelled + segment >= target) {
      const t = segment === 0 ? 0 : (target - travelled) / segment;
      const [a, b] = [route[i - 1], route[i]];
      return [round6(a[0] + (b[0] - a[0]) * t), round6(a[1] + (b[1] - a[1]) * t)];
    }
    travelled += segment;
  }
  return route[route.length - 1];
}

/** The route up to `fraction`, for drawing the part the rider has already covered. */
export function routeUntil(route, fraction) {
  const end = pointAlongRoute(route, fraction);
  if (!end) return [];
  const target = routeLength(route) * Math.min(1, Math.max(0, fraction));
  const covered = [route[0]];
  let travelled = 0;
  for (let i = 1; i < route.length; i++) {
    travelled += haversine(route[i - 1], route[i]);
    if (travelled >= target) break;
    covered.push(route[i]);
  }
  covered.push(end);
  return covered;
}
