import { NextResponse } from "next/server";

import { getVenuesPool } from "@/lib/venues/db";

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
    const result = await pool.query<{ id: number }>(
      `UPDATE venue_submissions
       SET status = 'rejected'
       WHERE id = $1
         AND status = 'pending'
       RETURNING id`,
      [submissionId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Submission not found or already processed." },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Space submission rejected." });
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
      { error: "Could not reject submission." },
      { status: 500 },
    );
  }
}
