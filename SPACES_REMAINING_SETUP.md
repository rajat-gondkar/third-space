# Spaces Remaining Setup

1. Create a Postgres database with PostGIS enabled.
2. Add env vars:
   - `VENUES_DATABASE_URL`
   - `OVERPASS_API_URL=https://overpass-api.de/api/interpreter`
   - `CRON_SECRET` optional
3. Apply schema:
   ```bash
   psql "$VENUES_DATABASE_URL" -f db/venues/schema.sql
   ```
4. Seed venues:
   ```bash
   npm run venues:seed -- --city Bengaluru
   ```
5. Refresh scores:
   ```bash
   curl -X POST http://localhost:3000/api/venues/refresh-scores
   ```
