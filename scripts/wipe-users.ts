import { Pool } from "pg";

const DIRECT_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function wipe() {
  const pool = new Pool({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Wiping all user data...");

    await pool.query("DELETE FROM public.college_email_verifications");
    console.log("Cleared college_email_verifications");

    await pool.query("DELETE FROM public.participants");
    console.log("Cleared participants");

    await pool.query("DELETE FROM public.activities");
    console.log("Cleared activities");

    await pool.query("DELETE FROM public.profiles");
    console.log("Cleared profiles");

    await pool.query("DELETE FROM auth.users");
    console.log("Cleared auth.users");

    console.log("\nDone! All user data wiped.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

wipe();