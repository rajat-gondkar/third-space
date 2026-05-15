import { NextResponse } from "next/server";

import { getVenuesPool } from "@/lib/venues/db";

type SubmissionRow = {
  tags: string[];
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submissionId = Number(id);

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return NextResponse.json({ error: "Invalid submission id." }, { status: 400 });
  }

  try {
    const pool = getVenuesPool();

    // 1. Fetch the submission tags before approval
    const subResult = await pool.query<SubmissionRow>(
      `SELECT tags FROM venue_submissions WHERE id = $1`,
      [submissionId],
    );
    const tags = subResult.rows[0]?.tags ?? [];

    // 2. Approve — inserts into venues
    const result = await pool.query<{ approve_venue_submission: number | null }>(
      `SELECT approve_venue_submission($1)`,
      [submissionId],
    );

    const venueId = result.rows[0]?.approve_venue_submission;

    if (!venueId) {
      return NextResponse.json(
        { error: "Submission not found or already processed." },
        { status: 404 },
      );
    }

    // 3. Insert submitted tags into venue_tags
    if (tags.length > 0) {
      for (const tag of tags) {
        await pool.query(
          `INSERT INTO venue_tags (venue_id, tag, count)
           VALUES ($1, $2, 1)
           ON CONFLICT (venue_id, tag) DO UPDATE SET
             count = venue_tags.count + 1`,
          [venueId, tag],
        );
      }
    }

    return NextResponse.json({
      venueId: Number(venueId),
      message: "Space approved and added to venues.",
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
      { error: "Could not approve submission." },
      { status: 500 },
    );
  }
}
