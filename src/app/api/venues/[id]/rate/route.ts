import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getVenuesPool } from "@/lib/venues/db";

type RatingRow = {
  id: string;
  venue_id: string;
  user_id: string;
  rating: number;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const venueId = Number(id);

  if (!Number.isInteger(venueId) || venueId <= 0) {
    return NextResponse.json({ error: "Invalid venue id." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    rating?: unknown;
  } | null;

  const rawRating = body?.rating;
  const rating =
    typeof rawRating === "string" ? Number(rawRating) : Number(rawRating);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5." },
      { status: 400 },
    );
  }

  try {
    const pool = getVenuesPool();

    // Upsert rating
    const result = await pool.query<RatingRow>(
      `INSERT INTO venue_ratings (venue_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (venue_id, user_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         updated_at = NOW()
       RETURNING id, venue_id, user_id, rating`,
      [venueId, user.id, rating],
    );

    const row = result.rows[0];

    // Get updated avg
    const avgResult = await pool.query<{ avg_rating: number; rating_count: number }>(
      `SELECT avg_rating, rating_count
       FROM venues
       WHERE id = $1`,
      [venueId],
    );

    const avgRow = avgResult.rows[0];

    return NextResponse.json({
      rating: {
        id: Number(row.id),
        venueId: Number(row.venue_id),
        userId: row.user_id,
        rating: row.rating,
        createdAt: new Date().toISOString(),
      },
      avgRating: Number(avgRow?.avg_rating ?? 0),
      ratingCount: Number(avgRow?.rating_count ?? 0),
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
      { error: "Could not submit rating." },
      { status: 500 },
    );
  }
}
