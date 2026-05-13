import { NextResponse } from "next/server";

import { getVenuesPool } from "@/lib/venues/db";

type TagRow = {
  id: string;
  tag: string;
  count: number;
};

function normalizeTag(value: unknown) {
  if (typeof value !== "string") return null;
  const tag = value.trim().toLowerCase().replace(/\s+/g, " ");
  return tag.length > 0 && tag.length <= 40 ? tag : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const venueId = Number(id);

  if (!Number.isInteger(venueId) || venueId <= 0) {
    return NextResponse.json({ error: "Invalid venue id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    tag?: unknown;
  } | null;
  const tag = normalizeTag(body?.tag);

  if (!tag) {
    return NextResponse.json({ error: "Invalid tag." }, { status: 400 });
  }

  try {
    const pool = getVenuesPool();
    const result = await pool.query<TagRow>(
      `INSERT INTO venue_tags (venue_id, tag, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (venue_id, tag) DO UPDATE SET
         count = venue_tags.count + 1
       RETURNING id, tag, count`,
      [venueId, tag],
    );

    const row = result.rows[0];

    return NextResponse.json({
      tag: {
        id: Number(row.id),
        tag: row.tag,
        count: row.count,
      },
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
      { error: "Could not update venue tag." },
      { status: 500 },
    );
  }
}
