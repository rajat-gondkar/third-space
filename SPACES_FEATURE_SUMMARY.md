# Spaces Feature Summary

This adds the full planned **Spaces** feature: a second bottom-tab experience for
discovering real-world venues near the user.

## What Was Added

- **Venues database scaffolding**
  - PostGIS schema in `db/venues/schema.sql`
  - Separate venues DB connection via `VENUES_DATABASE_URL`
  - Categories, venues, user vibe tags, spatial indexes, and score timestamps

- **OSM / Overpass ingestion**
  - Overpass fetch helper in `src/lib/venues/overpass.ts`
  - Seed script in `db/venues/seed.ts`
  - `npm run venues:seed -- --city Bengaluru`

- **Spaces API**
  - `GET /api/venues/nearby`
  - `GET /api/venues/[id]`
  - `POST /api/venues/[id]/tags`
  - `POST /api/venues/refresh-scores`

- **Spaces UI**
  - Auth-protected `/spaces` route
  - Leaflet venue map
  - Venue list and cards
  - Mobile bottom tabs for Activities and Spaces
  - Category filters, radius selector, and Nearest / Popular sorting
  - Venue detail bottom sheet with OSM details, vibe tags, and nearby activities

- **Popularity scoring**
  - OSM quality score
  - Recent activity density score
  - Vibe tag engagement score
  - Daily Vercel cron in `vercel.json`

- **Cleanup**
  - Fixed existing React lint issues in `JoinModal`, `ShareButton`, and `PostForm`
  - Full `npm run lint` and `npx tsc --noEmit` pass

## Environment Needed

```bash
VENUES_DATABASE_URL=postgresql://...
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
CRON_SECRET=optional-shared-secret
```

## Remaining External Setup

1. Provision a PostGIS-enabled Postgres database.
2. Apply `db/venues/schema.sql`.
3. Add `VENUES_DATABASE_URL` locally and in deployment.
4. Run the seed command for the target city.
5. Add `CRON_SECRET` in production if the score refresh route should be protected.
