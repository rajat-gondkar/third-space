# Venues Database

Epoch 1 creates a separate PostGIS-enabled Postgres database for real-world
venues. Keep this database separate from the existing Supabase activities DB.

## Required Environment

```bash
VENUES_DATABASE_URL=postgresql://...
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
CRON_SECRET=optional-shared-secret
```

`VENUES_DATABASE_SSL=false` can be set for local Postgres. Hosted providers
should use the default SSL behavior.

`CRON_SECRET` is optional locally. If set in production, call score refresh with
`Authorization: Bearer <CRON_SECRET>`.

## Apply Schema

```bash
psql "$VENUES_DATABASE_URL" -f db/venues/schema.sql
```

The schema is idempotent: tables, indexes, and seed categories can be applied
again during development.

## Seed Venues

```bash
npm run venues:seed -- --city Bengaluru
```

For custom areas, pass a bounding box as `south,west,north,east`:

```bash
npm run venues:seed -- --bbox "12.9000,77.5000,13.0500,77.7000"
```

During development, cap each category with:

```bash
npm run venues:seed -- --city Bengaluru --limit-per-category 25
```

## Refresh Scores

```bash
curl -X POST http://localhost:3000/api/venues/refresh-scores
```

Vercel runs this daily at 03:00 UTC using `vercel.json`.
