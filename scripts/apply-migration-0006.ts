import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const DIRECT_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function apply() {
  const pool = new Pool({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const sql = readFileSync(
      join(__dirname, "../supabase/migrations/0006_venue_ratings.sql"),
      "utf-8",
    );

    console.log("Applying migration 0006_venue_ratings.sql...");
    await pool.query(sql);
    console.log("Migration applied successfully.");
  } catch (err) {
    console.error("Error applying migration:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

apply();
