export const VENUE_CATEGORY_SLUGS = [
  "cafe",
  "park",
  "sports",
  "hobby",
] as const;

export type VenueCategorySlug = (typeof VENUE_CATEGORY_SLUGS)[number];

export type Category = {
  id: number;
  slug: VenueCategorySlug;
  label: string;
  emoji: string;
};

export type Venue = {
  id: number;
  osmId: number | null;
  osmType?: "node" | "way" | "relation";
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string | null;
  popularityScore: number;
  avgRating: number;
  ratingCount: number;
};

export type VenueWithDistance = Venue & {
  distanceMetres: number;
};

export type VenueSortMode = "nearest" | "popular";

export type VenueTag = {
  id: number;
  tag: string;
  count: number;
};

export type ActiveActivityAtVenue = {
  id: string;
  title: string;
  locationName: string | null;
  startTime: string;
  distanceMetres: number;
};

export type VenueDetail = VenueWithDistance & {
  osmTags: Record<string, string>;
  tags: VenueTag[];
  activities: ActiveActivityAtVenue[];
};

export type VenueRating = {
  id: number;
  venueId: number;
  userId: string;
  rating: number;
  createdAt: string;
};
