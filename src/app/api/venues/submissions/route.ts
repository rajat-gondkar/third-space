import { NextResponse } from "next/server";

import { getVenuesPool } from "@/lib/venues/db";

type SubmissionRow = {
  id: string;
  name: string;
  category_slug: string;
  tags: string[];
  lat: string | number;
  lng: string | number;
  address: string | null;
  submitted_by: string | null;
  status: string;
  created_at: string;
};

export async function GET() {
  try {
    const pool = getVenuesPool();
    const result = await pool.query<SubmissionRow>(
      `SELECT
        s.id,
        s.name,
        s.category_slug,
        s.tags,
        s.lat,
        s.lng,
        s.address,
        s.submitted_by,
        s.status,
        s.created_at,
        p.display_name as submitted_by_name
      FROM venue_submissions s
      LEFT JOIN public.profiles p ON p.id = s.submitted_by
      WHERE s.status = 'pending'
      ORDER BY s.created_at DESC`,
    );

    const submissions = result.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      categorySlug: row.category_slug,
      tags: row.tags ?? [],
      lat: Number(row.lat),
      lng: Number(row.lng),
      address: row.address,
      submittedBy: row.submitted_by,
      submittedByName: (row as unknown as { submitted_by_name?: string | null }).submitted_by_name ?? null,
      status: row.status,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ submissions });
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
      { error: "Could not load submissions." },
      { status: 500 },
    );
  }
}
