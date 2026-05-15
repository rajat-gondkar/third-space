import { NextResponse } from "next/server";

import { getVenuesPool } from "@/lib/venues/db";
import {
  VENUE_CATEGORY_SLUGS,
  type VenueCategorySlug,
  type VenueSortMode,
  type VenueWithDistance,
} from "@/lib/venues/types";

type VenueRow = {
  id: string;
  osm_id: string | null;
  name: string;
  address: string | null;
  popularity_score: string | number | null;
  avg_rating: string | number | null;
  rating_count: string | number | null;
  lat: string | number;
  lng: string | number;
  distance_metres: string | number;
  category_id: number;
  category_slug: VenueCategorySlug;
  category_label: string;
  category_emoji: string;
};

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCategory(value: string | null) {
  if (!value) return null;
  return VENUE_CATEGORY_SLUGS.includes(value as VenueCategorySlug)
    ? (value as VenueCategorySlug)
    : "invalid";
}

function parseSort(value: string | null): VenueSortMode | "invalid" {
  if (!value) return "nearest";
  return value === "nearest" || value === "popular" ? value : "invalid";
}

function toVenue(row: VenueRow): VenueWithDistance {
  return {
    id: Number(row.id),
    osmId: row.osm_id === null ? null : Number(row.osm_id),
    name: row.name,
    category: {
      id: row.category_id,
      slug: row.category_slug,
      label: row.category_label,
      emoji: row.category_emoji,
    },
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address,
    popularityScore: Number(row.popularity_score ?? 0),
    avgRating: Number(row.avg_rating ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    distanceMetres: Math.round(Number(row.distance_metres)),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseNumber(searchParams.get("lat"), 12.9716);
  const lng = parseNumber(searchParams.get("lng"), 77.5946);
  const all = searchParams.get("all") === "true";
  const radius = all
    ? 50000000
    : Math.min(
        Math.max(parseNumber(searchParams.get("radius"), 2000), 100),
        10000,
      );
  const category = all ? null : parseCategory(searchParams.get("category"));
  const sort = parseSort(searchParams.get("sort"));

  if (category === "invalid") {
    return NextResponse.json(
      { error: "Invalid venue category." },
      { status: 400 },
    );
  }

  if (sort === "invalid") {
    return NextResponse.json(
      { error: "Invalid venue sort mode." },
      { status: 400 },
    );
  }

  try {
    const pool = getVenuesPool();
    const values: Array<number | string> = [lng, lat, radius];
    const categoryClause = category ? "AND c.slug = $4" : "";
    if (category) values.push(category);

    const orderClause =
      sort === "popular"
        ? "ORDER BY v.popularity_score DESC NULLS LAST, distance_metres ASC"
        : "ORDER BY distance_metres ASC";

    const limit = all ? 2000 : 40;

    const result = await pool.query<VenueRow>(
      `SELECT
        v.id,
        v.osm_id,
        v.name,
        v.address,
        v.popularity_score,
        v.avg_rating,
        v.rating_count,
        ST_Y(v.location::geometry) AS lat,
        ST_X(v.location::geometry) AS lng,
        ST_Distance(
          v.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance_metres,
        c.id AS category_id,
        c.slug AS category_slug,
        c.label AS category_label,
        c.emoji AS category_emoji
      FROM venues v
      JOIN categories c ON c.id = v.category_id
      WHERE ST_DWithin(
        v.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ${categoryClause}
      ${orderClause}
      LIMIT ${limit}`,
      values,
    );

    return NextResponse.json({ venues: result.rows.map(toVenue) });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("VENUES_DATABASE_URL")
    ) {
      return NextResponse.json(
        { error: "Venues database is not configured." },
        { status: 503 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not load nearby venues." },
      { status: 500 },
    );
  }
}
