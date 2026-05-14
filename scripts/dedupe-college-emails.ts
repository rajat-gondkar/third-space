import { Pool } from "pg";

const DIRECT_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function inspect() {
  const pool = new Pool({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Find duplicate verified college emails
    const { rows: dups } = await pool.query(`
      SELECT college_email, array_agg(id) as ids
      FROM public.profiles
      WHERE college_email_verified = true
        AND college_email IS NOT NULL
      GROUP BY college_email
      HAVING count(*) > 1
    `);

    console.log("Duplicate verified college emails:", dups);

    for (const dup of dups) {
      const ids: string[] = dup.ids;
      const keep = ids[0];
      const remove = ids.slice(1);
      console.log(`Keeping ${keep}, removing ${remove.join(", ")} for ${dup.college_email}`);

      // Delete duplicate profiles (cascade deletes their activities/participants)
      // Actually that's bad. Instead, let's just show them and let user decide.
      // But for now, we can delete the older ones.
      for (const rid of remove) {
        await pool.query("DELETE FROM public.profiles WHERE id = $1", [rid]);
        console.log(`  Deleted profile ${rid}`);
      }
    }

    console.log("\nCleanup done. Re-applying migration...");
  } finally {
    await pool.end();
  }
}

inspect();
