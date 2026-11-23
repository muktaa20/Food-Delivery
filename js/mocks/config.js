/**
 * Network simulation settings for the mock API, controlled from the URL so
 * loading and error states are easy to demo:
 *
 *   ?latency=2000     fixed response delay in ms (default: random 300-800 ms)
 *   ?errorRate=0.3    fraction of requests that fail with HTTP 500 (default: 0)
 *   ?speed=10         run new orders' delivery timeline 10x faster (default: 1)
 *   ?mock=reset       clear all overrides
 *
 * Overrides are kept in sessionStorage, so they apply to every page for the
 * rest of the tab session.
 */
const STORAGE_KEY = "fd_mock_config";
const DEFAULT_LATENCY = { min: 300, max: 800 };

function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function toNumberInRange(value, min, max) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : undefined;
}

function applyUrlOverrides() {
  const params = new URLSearchParams(location.search);
  if (!["latency", "errorRate", "speed", "mock"].some((key) => params.has(key))) return;

  const saved = params.get("mock") === "reset" ? {} : readSaved();
  if (params.has("latency")) saved.latency = toNumberInRange(params.get("latency"), 0, 10_000);
  if (params.has("errorRate")) saved.errorRate = toNumberInRange(params.get("errorRate"), 0, 1);
  if (params.has("speed")) saved.speed = toNumberInRange(params.get("speed"), 1, 100);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

applyUrlOverrides();

/** Read on every request, so changes made mid-session (e.g. from DevTools) take effect immediately. */
export function getMockConfig() {
  const saved = readSaved();
  return {
    latency: saved.latency ?? null,
    errorRate: saved.errorRate ?? 0,
    speed: saved.speed ?? 1,
  };
}

export function nextLatency() {
  const { latency } = getMockConfig();
  if (latency !== null) return latency;
  return DEFAULT_LATENCY.min + Math.random() * (DEFAULT_LATENCY.max - DEFAULT_LATENCY.min);
}
