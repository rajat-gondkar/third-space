import { createVenuesPool } from "../../src/lib/venues/pool";
import {
  CATEGORY_QUERIES,
  DEFAULT_BENGALURU_BBOX,
  fetchVenuesFromOverpass,
} from "../../src/lib/venues/overpass";

type SeedOptions = {
  bbox: string;
  limitPerCategory: number | null;
};

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readOptions(): SeedOptions {
  const bbox =
    readArg("--bbox") ??
    (readArg("--city")?.toLowerCase() === "bengaluru"
      ? DEFAULT_BENGALURU_BBOX
      : undefined) ??
    DEFAULT_BENGALURU_BBOX;

  const limitValue = readArg("--limit-per-category");
  const limitPerCategory = limitValue ? Number.parseInt(limitValue, 10) : null;

  if (limitPerCategory !== null && !Number.isFinite(limitPerCategory)) {
    throw new Error("--limit-per-category must be a number.");
  }

  return { bbox, limitPerCategory };
}

async function seed() {
  const options = readOptions();
  const pool = createVenuesPool();

  try {
    for (const category of CATEGORY_QUERIES) {
      const venues = await fetchVenuesFromOverpass(category.query, options.bbox);
      const limitedVenues =
        options.limitPerCategory === null
          ? venues
          : venues.slice(0, options.limitPerCategory);

      const categoryResult = await pool.query<{ id: number }>(
        "SELECT id FROM categories WHERE slug = $1",
        [category.slug],
      );
      const categoryId = categoryResult.rows[0]?.id;

      if (!categoryId) {
        throw new Error(`Missing category row for slug "${category.slug}".`);
      }

      for (const venue of limitedVenues) {
        await pool.query(
          `INSERT INTO venues (
            osm_id,
            osm_type,
            name,
            category_id,
            location,
            address,
            osm_tags,
            popularity_score,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
            $7,
            $8,
            $9,
            NOW()
          )
          ON CONFLICT (osm_type, osm_id) DO UPDATE SET
            name = EXCLUDED.name,
            category_id = EXCLUDED.category_id,
            location = EXCLUDED.location,
            address = EXCLUDED.address,
            osm_tags = EXCLUDED.osm_tags,
            popularity_score = EXCLUDED.popularity_score,
            updated_at = NOW()`,
          [
            venue.osmId,
            venue.osmType,
            venue.name,
            categoryId,
            venue.lng,
            venue.lat,
            venue.address,
            JSON.stringify(venue.tags),
            venue.popularityScore,
          ],
        );
      }

      console.info(
        `Seeded ${limitedVenues.length}/${venues.length} ${category.slug} venues.`,
      );
    }
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
