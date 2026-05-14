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
      join(__dirname, "../supabase/migrations/0005_bidirectional_linking.sql"),
      "utf-8",
    );

    console.log("Applying migration 0005_bidirectional_linking.sql...");
    await pool.query(sql);
    console.log("Schema migration applied.");

    // ------------------------------------------------------------------------
    // Data recovery: find orphaned auth users (no profile) and link them back
    // to the profile whose college_email matches their email.
    // ------------------------------------------------------------------------

    const { rows: orphaned } = await pool.query(`
      SELECT u.id, u.email
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE p.id IS NULL
    `);

    console.log(`Found ${orphaned.length} orphaned auth users.`);

    for (const user of orphaned) {
      // Find the profile that has this email as its verified college email
      const { rows: profiles } = await pool.query(
        `
        SELECT id, college_email, display_name
        FROM public.profiles
        WHERE college_email = $1
          AND college_email_verified = true
        LIMIT 1
        `,
        [user.email],
      );

      if (profiles.length > 0) {
        await pool.query(
          `
          UPDATE public.profiles
             SET linked_user_id = $1
           WHERE id = $2
          `,
          [user.id, profiles[0].id],
        );
        console.log(
          `  Linked ${user.email} (${user.id}) → profile ${profiles[0].id} (${profiles[0].display_name})`,
        );
        continue;
      }

      // If no college_email match, try matching by any verified profile
      // whose college_email domain is the same (heuristic fallback)
      const { rows: heuristic } = await pool.query(
        `
        SELECT id, college_email, display_name
        FROM public.profiles
        WHERE college_email_verified = true
          AND college_email IS NOT NULL
          AND (
            split_part($1, '@', 1) = split_part(college_email, '@', 1)
            OR split_part($1, '@', 2) = split_part(college_email, '@', 2)
          )
        LIMIT 1
        `,
        [user.email],
      );

      if (heuristic.length > 0) {
        await pool.query(
          `
          UPDATE public.profiles
             SET linked_user_id = $1
           WHERE id = $2
          `,
          [user.id, heuristic[0].id],
        );
        console.log(
          `  Heuristic link ${user.email} (${user.id}) → profile ${heuristic[0].id} (${heuristic[0].display_name})`,
        );
      } else {
        console.log(`  Could not link ${user.email} (${user.id})`);
      }
    }

    console.log("\nDone!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

apply();
