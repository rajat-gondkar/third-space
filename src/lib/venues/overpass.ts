import type { VenueCategorySlug } from "@/lib/venues/types";

export type RawOSMVenue = {
  osmId: number;
  osmType: "node" | "way" | "relation";
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
  popularityScore: number;
  address: string | null;
};

type OverpassElement = {
  type: RawOSMVenue["osmType"];
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

export type OverpassCategoryQuery = {
  slug: VenueCategorySlug;
  query: string;
};

export const CATEGORY_QUERIES: OverpassCategoryQuery[] = [
  { slug: "cafe", query: `node["amenity"="cafe"]` },
  { slug: "park", query: `way["leisure"="park"]` },
  { slug: "sports", query: `node["leisure"="pitch"]` },
  { slug: "hobby", query: `node["amenity"="community_centre"]` },
];

export const DEFAULT_BENGALURU_BBOX = "12.9000,77.5000,13.0500,77.7000";

export function derivePopularityScore(tags: Record<string, string>) {
  let score = 0;

  if (tags.opening_hours) score += 1;
  if (tags.phone || tags["contact:phone"] || tags.website || tags["contact:website"]) {
    score += 1;
  }
  if (tags.wheelchair === "yes") score += 0.5;
  if (Object.keys(tags).length > 3) score += 1;

  return Math.min(score, 10);
}

export function addressFromTags(tags: Record<string, string>) {
  const houseNumber = tags["addr:housenumber"];
  const street = tags["addr:street"];
  const neighbourhood =
    tags["addr:neighbourhood"] ?? tags["addr:suburb"] ?? tags["addr:district"];
  const city = tags["addr:city"];

  return [houseNumber, street, neighbourhood, city].filter(Boolean).join(", ") || null;
}

function overpassQuery(query: string, bbox: string) {
  return `[out:json][timeout:25];
(
  ${query}(${bbox});
);
out center tags;`;
}

export async function fetchVenuesFromOverpass(
  query: string,
  bbox: string,
): Promise<RawOSMVenue[]> {
  const endpoint =
    process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "third-space-venues-seeder/0.1",
    },
    body: new URLSearchParams({ data: overpassQuery(query, bbox) }),
  });

  if (!response.ok) {
    throw new Error(
      `Overpass request failed with ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as OverpassResponse;

  return (payload.elements ?? [])
    .map((element): RawOSMVenue | null => {
      const tags = element.tags ?? {};
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      const name = tags.name?.trim();

      if (!name || typeof lat !== "number" || typeof lng !== "number") {
        return null;
      }

      return {
        osmId: element.id,
        osmType: element.type,
        name,
        lat,
        lng,
        tags,
        popularityScore: derivePopularityScore(tags),
        address: addressFromTags(tags),
      };
    })
    .filter((venue): venue is RawOSMVenue => venue !== null);
}
