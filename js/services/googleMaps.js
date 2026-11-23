import { GOOGLE_MAPS_API_KEY } from "../config.js";

let loading;

export const hasGoogleMapsKey = () => Boolean(GOOGLE_MAPS_API_KEY);

export function loadGoogleMaps() {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (!hasGoogleMapsKey()) return Promise.reject(new Error("No Google Maps API key configured."));

  loading ??= new Promise((resolve, reject) => {
    const callback = `__onGoogleMaps${Date.now()}`;
    window[callback] = () => {
      delete window[callback];
      resolve(window.google.maps);
    };
    // Google calls this global when the key is invalid or the API isn't enabled.
    window.gm_authFailure = () => reject(new Error("Google Maps rejected the API key."));

    const params = new URLSearchParams({ key: GOOGLE_MAPS_API_KEY, callback, v: "weekly", loading: "async" });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Could not load Google Maps."));
    };
    document.head.append(script);
  });
  return loading;
}
