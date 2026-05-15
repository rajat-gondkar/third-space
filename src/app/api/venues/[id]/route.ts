import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getVenuesPool } from "@/lib/venues/db";
import type {
  ActiveActivityAtVenue,
  VenueCategorySlug,
  VenueDetail,
  VenueTag,
} from "@/lib/venues/types";

type VenueRow = {
  id: string;
  osm_id: string | null;
  osm_type: "node" | "way" | "relation";
  name: string;
  address: string | null;
  osm_tags: Record<string, string> | null;
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

type TagRow = {
  id: string;
  tag: string;
  count: number;
};

type ActivityRow = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  location_name: string | null;
  start_time: string;
};

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function distanceMetres(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const earthRadius = 6371000;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toTag(row: TagRow): VenueTag {
  return {
    id: Number(row.id),
    tag: row.tag,
    count: row.count,
  };
}

function toVenue(
  row: VenueRow,
  tags: VenueTag[],
  activities: ActiveActivityAtVenue[],
): VenueDetail {
  return {
    id: Number(row.id),
    osmId: row.osm_id === null ? null : Number(row.osm_id),
    osmType: row.osm_type,
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
    osmTags: row.osm_tags ?? {},
    tags,
    activities,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const venueId = Number(id);

  if (!Number.isInteger(venueId) || venueId <= 0) {
    return NextResponse.json({ error: "Invalid venue id." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseNumber(searchParams.get("lat"), 12.9716);
  const lng = parseNumber(searchParams.get("lng"), 77.5946);

  try {
    const pool = getVenuesPool();
    const venueResult = await pool.query<VenueRow>(
      `SELECT
        v.id,
        v.osm_id,
        v.osm_type,
        v.name,
        v.address,
        v.osm_tags,
        v.popularity_score,
        v.avg_rating,
        v.rating_count,
        ST_Y(v.location::geometry) AS lat,
        ST_X(v.location::geometry) AS lng,
        ST_Distance(
          v.location,
          ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
        ) AS distance_metres,
        c.id AS category_id,
        c.slug AS category_slug,
        c.label AS category_label,
        c.emoji AS category_emoji
      FROM venues v
      JOIN categories c ON c.id = v.category_id
      WHERE v.id = $1
      LIMIT 1`,
      [venueId, lng, lat],
    );
    const venue = venueResult.rows[0];

    if (!venue) {
      return NextResponse.json({ error: "Venue not found." }, { status: 404 });
    }

    const tagsResult = await pool.query<TagRow>(
      `SELECT id, tag, count
       FROM venue_tags
       WHERE venue_id = $1
       ORDER BY count DESC, tag ASC
       LIMIT 12`,
      [venueId],
    );

    const supabase = await createClient();
    const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("activities")
      .select("id,title,lat,lng,location_name,start_time")
      .gt("start_time", cutoff)
      .order("start_time", { ascending: true })
      .limit(80);

    const venueCoords = { lat: Number(venue.lat), lng: Number(venue.lng) };
    const activities: ActiveActivityAtVenue[] = ((data as ActivityRow[] | null) ?? [])
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        locationName: activity.location_name,
        startTime: activity.start_time,
        distanceMetres: Math.round(
          distanceMetres(venueCoords, {
            lat: activity.lat,
            lng: activity.lng,
          }),
        ),
      }))
      .filter((activity) => activity.distanceMetres <= 100)
      .slice(0, 5);

    return NextResponse.json({
      venue: toVenue(venue, tagsResult.rows.map(toTag), activities),
    });
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
      { error: "Could not load venue details." },
      { status: 500 },
    );
  }
}
