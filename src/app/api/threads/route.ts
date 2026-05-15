import { NextResponse, type NextRequest } from "next/server";

import { getVenuesPool } from "@/lib/venues/db";
import { createClient } from "@/lib/supabase/server";
import type { Thread } from "@/lib/types";

type VenueRow = {
  id: string;
  name: string;
  address: string | null;
  lat: string | number;
  lng: string | number;
  category_slug: string;
  category_emoji: string;
};

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseNumber(searchParams.get("lat"), 12.9716);
  const lng = parseNumber(searchParams.get("lng"), 77.5946);

  try {
    const pool = getVenuesPool();
    const venueResult = await pool.query<VenueRow>(
      `SELECT
        v.id,
        v.name,
        v.address,
        ST_Y(v.location::geometry) AS lat,
        ST_X(v.location::geometry) AS lng,
        c.slug AS category_slug,
        c.emoji AS category_emoji
      FROM venues v
      JOIN categories c ON c.id = v.category_id
      WHERE ST_DWithin(
        v.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        10000
      )
      ORDER BY ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) ASC
      LIMIT 100`,
      [lng, lat],
    );

    const venues = venueResult.rows;

    // Ensure thread rows exist for each venue
    const threadsToUpsert = venues.map((v) => ({
      venue_id: Number(v.id),
      name: v.name,
      location_name: v.address,
      lat: Number(v.lat),
      lng: Number(v.lng),
      category_slug: v.category_slug,
      category_emoji: v.category_emoji,
    }));

    if (threadsToUpsert.length > 0) {
      await supabase.from("threads").upsert(threadsToUpsert, {
        onConflict: "venue_id",
        ignoreDuplicates: true,
      });
    }

    // Fetch threads with post counts
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("*, thread_posts(count)")
      .in(
        "venue_id",
        venues.map((v) => Number(v.id)),
      )
      .order("created_at", { ascending: false });

    if (threadsError) {
      console.error(threadsError);
      return NextResponse.json(
        { error: "Could not load threads." },
        { status: 500 },
      );
    }

    // Map post count and sort by venue distance order
    const venueIdOrder = new Map(venues.map((v, i) => [Number(v.id), i]));
    const threadsWithCount: Thread[] = (threads ?? [])
      .map((t) => ({
        ...t,
        post_count: (t as Record<string, unknown>)["thread_posts"] as
          | { count: number }[]
          | undefined,
      }))
      .map((t) => ({
        ...t,
        post_count: Array.isArray(t.post_count)
          ? t.post_count[0]?.count ?? 0
          : 0,
      }))
      .sort((a, b) => {
        const aIdx = venueIdOrder.get(a.venue_id) ?? Infinity;
        const bIdx = venueIdOrder.get(b.venue_id) ?? Infinity;
        return aIdx - bIdx;
      });

    return NextResponse.json({ threads: threadsWithCount });
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
      { error: "Could not load threads." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as {
    venue_id: number;
    name: string;
    location_name?: string;
    lat?: number;
    lng?: number;
    category_slug?: string;
    category_emoji?: string;
  };

  const { data, error } = await supabase
    .from("threads")
    .upsert(
      {
        venue_id: body.venue_id,
        name: body.name,
        location_name: body.location_name ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        category_slug: body.category_slug ?? null,
        category_emoji: body.category_emoji ?? null,
      },
      { onConflict: "venue_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ thread: data });
}
