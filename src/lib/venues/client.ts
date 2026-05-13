import type {
  VenueCategorySlug,
  VenueDetail,
  VenueSortMode,
  VenueTag,
  VenueWithDistance,
} from "@/lib/venues/types";

type NearbyVenuesParams = {
  lat: number;
  lng: number;
  radius?: number;
  category?: VenueCategorySlug | null;
  sort?: VenueSortMode;
};

type NearbyVenuesResponse = {
  venues: VenueWithDistance[];
  error?: string;
};

export async function fetchNearbyVenues({
  lat,
  lng,
  radius = 2000,
  category,
  sort = "nearest",
}: NearbyVenuesParams) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    sort,
  });

  if (category) params.set("category", category);

  const response = await fetch(`/api/venues/nearby?${params.toString()}`);
  const payload = (await response.json()) as NearbyVenuesResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load nearby venues.");
  }

  return payload.venues;
}

type VenueDetailResponse = {
  venue: VenueDetail;
  error?: string;
};

export async function fetchVenueDetail({
  id,
  lat,
  lng,
}: {
  id: number;
  lat: number;
  lng: number;
}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  const response = await fetch(`/api/venues/${id}?${params.toString()}`);
  const payload = (await response.json()) as VenueDetailResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load venue details.");
  }

  return payload.venue;
}

type TagResponse = {
  tag: VenueTag;
  error?: string;
};

export async function upvoteVenueTag({
  venueId,
  tag,
}: {
  venueId: number;
  tag: string;
}) {
  const response = await fetch(`/api/venues/${venueId}/tags`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tag }),
  });
  const payload = (await response.json()) as TagResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not update venue tag.");
  }

  return payload.tag;
}
