import { Pool } from "pg";

const DIRECT_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function fix() {
  const pool = new Pool({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Link the orphaned Gmail user to the existing verified profile
    const { rows } = await pool.query(`
      UPDATE public.profiles
         SET linked_user_id = 'f08d9368-47f7-4ee8-b141-b40a879012d4'
       WHERE college_email_verified = true
         AND linked_user_id IS NULL
      RETURNING id, display_name, college_email
    `);

    if (rows.length > 0) {
      console.log("Fixed profile:", rows[0]);
    } else {
      console.log("No profile needed fixing.");
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fix();
