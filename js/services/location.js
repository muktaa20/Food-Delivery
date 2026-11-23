/**
 * "Use my current location": browser Geolocation API + reverse geocoding
 * with OpenStreetMap's free Nominatim service (no API key; max 1 request/s).
 */
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCODE_TIMEOUT_MS = 8000;

export class LocationError extends Error {}

const POSITION_ERRORS = {
  1: "Location access was denied. You can type your address instead.",
  2: "We couldn't detect your location. Please type your address.",
  3: "Finding your location took too long. Try again or type your address.",
};

/** @returns {Promise<[number, number]>} [lat, lng] */
export function getCurrentPosition({ timeout = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new LocationError("Your browser doesn't support location access."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      (err) => reject(new LocationError(POSITION_ERRORS[err.code] ?? POSITION_ERRORS[2])),
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 }
    );
  });
}

/**
 * @param {[number, number]} point
 * @returns {Promise<{ flat: string, area: string, city: string, pincode: string }>}
 */
export async function reverseGeocode([lat, lng]) {
  const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": "en" },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });
  } catch {
    throw new LocationError("Couldn't look up your address.");
  }
  if (!response.ok) throw new LocationError("Couldn't look up your address.");

  const { address = {} } = await response.json();
  const locality = address.neighbourhood || address.suburb || address.city_district || address.quarter;
  return {
    flat: [address.house_number, address.building].filter(Boolean).join(", "),
    area: [address.road, locality].filter(Boolean).join(", "),
    city: address.city || address.town || address.village || address.county || address.state_district || "",
    pincode: (address.postcode || "").replace(/\s/g, ""),
  };
}
