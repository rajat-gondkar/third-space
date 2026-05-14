import { Pool } from "pg";
import { createBrowserClient } from "@supabase/ssr";
import { refreshVenueScores } from "../../src/lib/venues/scoring";

const VENUES_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

const SUPABASE_URL = "https://bsplfuzefathlfcxsteb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcGxmdXplZmF0aGxmY3hzdGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzEzMDUsImV4cCI6MjA5NDI0NzMwNX0.d496Uy823eOjW5SwUnAd7ixyUhZNLCsS0_ptEAxOCjQ";

async function run() {
  const pool = new Pool({
    connectionString: VENUES_URL,
    ssl: { rejectUnauthorized: false },
  });

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const result = await refreshVenueScores({ pool, supabase });
    console.log("Refresh complete:", result);
  } catch (error) {
    console.error("Refresh failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
