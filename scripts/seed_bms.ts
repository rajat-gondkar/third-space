import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const DIRECT_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function seed() {
  const pool = new Pool({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // get a valid user
    const { rows: users } = await pool.query("SELECT id FROM public.profiles LIMIT 1");
    if (users.length === 0) {
      console.log("No users found to host the events.");
      return;
    }
    const hostId = users[0].id;
    console.log(`Using host id: ${hostId}`);

    const eventsPath = path.join(__dirname, "../src/data/bms_events_bengaluru_with_coords.json");
    const events = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));

    for (const ev of events) {
      // Mock start time to tomorrow
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1);

      await pool.query(
        `INSERT INTO public.activities (host_id, title, description, category, lat, lng, location_name, start_time, max_participants)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          hostId,
          ev.event_name,
          ev.event_type,
          ev.category,
          ev.lat,
          ev.lng,
          ev.location,
          startTime.toISOString(),
          50
        ]
      );
      console.log(`Inserted: ${ev.event_name}`);
    }

    console.log("Seeding complete.");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

seed();
