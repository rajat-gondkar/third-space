/**
 * Geocoding helpers backed by OpenStreetMap Nominatim (free, no API key).
 *
 * Usage policy: <https://operations.osmfoundation.org/policies/nominatim/>
 * - 1 req/sec (we debounce typing to comfortably stay under)
 * - Identify via Referer (browser sends it automatically)
 * - Reasonable caching is encouraged, but for V1 the live calls are fine.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org";

export type GeocodeSuggestion = {
  lat: number;
  lng: number;
  label: string;     // short, human label e.g. "Koramangala, Bengaluru"
  fullName: string;  // full Nominatim display_name
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
};

/**
 * Build a concise label like "Koramangala, Bengaluru" from a Nominatim result,
 * preferring fine-grained components (suburb, neighbourhood, road) over full
 * postal-style addresses.
 */
function toLabel(r: NominatimResult): string {
  const a = r.address ?? {};
  const primary =
    a.suburb ||
    a.neighbourhood ||
    a.residential ||
    a.quarter ||
    a.hamlet ||
    a.locality ||
    a.tourism ||
    a.amenity ||
    a.shop ||
    a.road;
  const city = a.city || a.town || a.village || a.county;

  if (primary && city && primary.toLowerCase() !== city.toLowerCase()) {
    return `${primary}, ${city}`;
  }
  if (primary) return primary;
  if (city) return city;
  return (r.display_name ?? "").split(",").slice(0, 2).join(",").trim();
}

function toSuggestion(r: NominatimResult): GeocodeSuggestion {
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    label: toLabel(r),
    fullName: r.display_name,
  };
}

export async function forwardGeocode(
  query: string,
  options?: {
    signal?: AbortSignal;
    countryCodes?: string;
    lat?: number;
    lon?: number;
  },
): Promise<GeocodeSuggestion[]> {
  if (!query.trim()) return [];
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  if (options?.countryCodes) {
    url.searchParams.set("countrycodes", options.countryCodes);
  }
  if (options?.lat != null && options?.lon != null) {
    url.searchParams.set("lat", String(options.lat));
    url.searchParams.set("lon", String(options.lon));
  }
  const res = await fetch(url.toString(), {
    signal: options?.signal,
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  return data.map(toSuggestion);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  options?: { signal?: AbortSignal },
): Promise<string | null> {
  const url = new URL(`${NOMINATIM}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "16");
  const res = await fetch(url.toString(), {
    signal: options?.signal,
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult;
  return toLabel(data);
}
