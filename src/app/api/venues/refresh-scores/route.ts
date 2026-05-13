import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getVenuesPool } from "@/lib/venues/db";
import { refreshVenueScores } from "@/lib/venues/scoring";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const pool = getVenuesPool();
    const supabase = await createClient();
    const result = await refreshVenueScores({ pool, supabase });

    return NextResponse.json(result);
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
      { error: "Could not refresh venue scores." },
      { status: 500 },
    );
  }
}
