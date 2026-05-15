import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getVenuesPool } from "@/lib/venues/db";
import { reverseGeocode } from "@/lib/geocoding";

type SubmissionBody = {
  name?: unknown;
  category_slug?: unknown;
  tags?: unknown;
  lat?: unknown;
  lng?: unknown;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const VALID_CATEGORIES = ["cafe", "park", "sports", "hobby"] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubmissionBody | null;

  const name = normalizeString(body?.name);
  const categorySlug = normalizeString(body?.category_slug);
  const lat =
    typeof body?.lat === "string" ? Number(body.lat) : Number(body?.lat);
  const lng =
    typeof body?.lng === "string" ? Number(body.lng) : Number(body?.lng);

  if (!name || name.length > 200) {
    return NextResponse.json(
      { error: "Name is required (max 200 chars)." },
      { status: 400 },
    );
  }

  if (!categorySlug || !VALID_CATEGORIES.includes(categorySlug as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json(
      { error: "Invalid category." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Invalid location coordinates." },
      { status: 400 },
    );
  }

  const rawTags = body?.tags;
  const tags: string[] =
    Array.isArray(rawTags)
      ? rawTags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0 && t.length <= 40)
          .slice(0, 8)
      : [];

  let address: string | null = null;
  try {
    address = await reverseGeocode(lat, lng);
  } catch {
    /* ignore geocoding failure */
  }

  try {
    const pool = getVenuesPool();
    const result = await pool.query<{ id: number }>(
      `INSERT INTO venue_submissions (name, category_slug, tags, lat, lng, address, submitted_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id`,
      [name, categorySlug, tags, lat, lng, address, user.id],
    );

    return NextResponse.json({
      id: Number(result.rows[0].id),
      message: "Space submitted for review.",
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
      { error: "Could not submit space." },
      { status: 500 },
    );
  }
}
