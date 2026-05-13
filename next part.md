# Third Space — "Spaces" Tab Feature Plan

> **Scope:** Add a second bottom-tab called **Spaces** — a map + list interface showing
> real-world venues (cafés, parks, sports grounds, hobby hubs) near the user, enriched
> with review signals. This document is structured as iterative epochs so each one ships
> independently and builds on the last.

---

## Architecture Decisions

### Data Source Strategy

| Layer | What it holds | Tech |
|---|---|---|
| **Venue data** | OSM POI data + enriched metadata | PostgreSQL (new DB, separate from Supabase activities DB) |
| **Review signals** | Aggregated rating/popularity scores pulled from OpenStreetMap + Overpass API | Stored in same PostgreSQL DB, refreshed via cron |
| **User-generated tags** | "vibe" tags users attach to venues | Same PostgreSQL DB |
| **Supabase (existing)** | Activities, auth, participants — untouched | Keep as-is |

### Why a separate PostgreSQL DB (not MongoDB)

- Venue data is relational: venues → categories → reviews → user tags.
- PostGIS extension gives native `ST_DWithin`, `ST_Distance` — critical for "nearby" queries.
- Familiar stack (you already use Postgres via Supabase); no new mental model.
- Can host on **Supabase as a second project** (free tier), **Neon**, or **Railway** — all give a `DATABASE_URL` string.

### New env vars needed

```
# New venues DB (PostGIS-enabled Postgres)
VENUES_DATABASE_URL=postgresql://...

# Overpass API (free, no key needed — just endpoint)
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
```

---

## Project Structure Additions

```
src/
  app/
    map/page.tsx              # ← existing, unchanged
    spaces/
      page.tsx                # New tab: Spaces map + list (auth required)
      loading.tsx             # Skeleton loader
  components/
    spaces/
      SpacesMap.tsx           # Leaflet map (dynamic import, SSR disabled) — shows venue pins
      SpacesMapClient.tsx     # Actual Leaflet logic for venue pins
      SpacesList.tsx          # Scrollable list of venues with category filters
      SpaceCard.tsx           # Single venue card (name, category, distance, score)
      SpacesFiltersBar.tsx    # Category pill filters (café / park / sports / hobby)
      VenueSheet.tsx          # Bottom-sheet detail view on pin tap (mobile)
  lib/
    venues/
      client.ts               # Browser fetch helpers for /api/venues/*
      types.ts                # Venue, Category, VenueWithDistance TS types
  db/
    venues/
      schema.sql              # Full PostGIS schema (see Epoch 1)
      seed.ts                 # Dev seed script (pulls from Overpass)
  app/
    api/
      venues/
        nearby/route.ts       # GET /api/venues/nearby?lat=&lng=&radius=&category=
        [id]/route.ts         # GET /api/venues/:id (detail + tags)
```

---

## Bottom Tab Navigation

Add a persistent bottom nav bar (mobile-first) to `app/layout.tsx` or a shared shell:

```
[ 🏃 Activities ]   [ 🗺 Spaces ]
```

Both tabs live at `/map` and `/spaces` respectively.
The nav bar is a new `BottomNav.tsx` client component that highlights the active route.

---

---

# Epoch 1 — Database & Schema Scaffolding

**Goal:** Stand up the venues PostgreSQL database with PostGIS. No UI yet.

## 1.1 Create the new Postgres database

- Spin up a second Supabase project **or** a Neon/Railway Postgres instance.
- Enable the PostGIS extension:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  ```
- Add `VENUES_DATABASE_URL` to `.env.local` and Vercel environment variables.

## 1.2 Schema (`db/venues/schema.sql`)

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Categories ──────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,        -- 'cafe', 'park', 'sports', 'hobby'
  label       TEXT NOT NULL,              -- 'Café', 'Park', 'Sports Ground', 'Hobby Hub'
  emoji       TEXT NOT NULL,              -- '☕', '🌳', '⚽', '🎨'
  osm_tags    JSONB NOT NULL DEFAULT '{}' -- e.g. {"amenity": "cafe"}
);

-- ── Venues ──────────────────────────────────────────────────────────────────
CREATE TABLE venues (
  id              BIGSERIAL PRIMARY KEY,
  osm_id          BIGINT UNIQUE,           -- OpenStreetMap node/way ID
  name            TEXT NOT NULL,
  category_id     INT REFERENCES categories(id),
  location        GEOGRAPHY(Point, 4326) NOT NULL,  -- PostGIS point
  address         TEXT,
  osm_tags        JSONB NOT NULL DEFAULT '{}',       -- raw OSM tags for future use
  popularity_score NUMERIC(4,2) DEFAULT 0,           -- 0–10, derived from OSM data
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast nearby queries
CREATE INDEX venues_location_idx ON venues USING GIST (location);
CREATE INDEX venues_category_idx ON venues (category_id);

-- ── Venue Tags (user-generated "vibes") ─────────────────────────────────────
-- Scaffolded now, used in Epoch 4
CREATE TABLE venue_tags (
  id         BIGSERIAL PRIMARY KEY,
  venue_id   BIGINT REFERENCES venues(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL,               -- 'quiet', 'good wifi', 'dog friendly', etc.
  count      INT DEFAULT 1,
  UNIQUE (venue_id, tag)
);

-- ── Seed categories ─────────────────────────────────────────────────────────
INSERT INTO categories (slug, label, emoji, osm_tags) VALUES
  ('cafe',   'Café',          '☕', '{"amenity": "cafe"}'),
  ('park',   'Park',          '🌳', '{"leisure": "park"}'),
  ('sports', 'Sports Ground', '⚽', '{"leisure": "pitch"}'),
  ('hobby',  'Hobby Hub',     '🎨', '{"amenity": "community_centre"}');
```

## 1.3 DB client (`lib/venues/client.ts`)

A lightweight Postgres client using `pg` or `postgres` (node-postgres):

```typescript
// lib/venues/db.ts  (server-only, never imported in Client Components)
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.VENUES_DATABASE_URL })
export default pool
```

## 1.4 TypeScript types (`lib/venues/types.ts`)

```typescript
export type Category = {
  id: number
  slug: 'cafe' | 'park' | 'sports' | 'hobby'
  label: string
  emoji: string
}

export type Venue = {
  id: number
  osmId: number | null
  name: string
  category: Category
  lat: number
  lng: number
  address: string | null
  popularityScore: number
}

export type VenueWithDistance = Venue & { distanceMetres: number }
```

## Epoch 1 Checklist

- [ ] New Postgres DB provisioned with PostGIS enabled
- [ ] `schema.sql` applied to DB
- [ ] `VENUES_DATABASE_URL` added to env
- [ ] `lib/venues/db.ts` created
- [ ] `lib/venues/types.ts` created
- [ ] `npm install pg` (or `postgres`) added to dependencies

---

---

# Epoch 2 — Data Ingestion (Overpass API Seeder)

**Goal:** Populate the venues table with real OSM data for any city. No UI yet.

## 2.1 Overpass seed script (`db/venues/seed.ts`)

Run manually (or as a cron job later) to pull POIs from OpenStreetMap for a bounding box.

```typescript
// db/venues/seed.ts
// Usage: npx ts-node db/venues/seed.ts --city "Bengaluru"

import pool from '@/lib/venues/db'
import { fetchVenuesFromOverpass } from '@/lib/venues/overpass'

const CATEGORY_QUERIES = [
  { slug: 'cafe',   query: `node["amenity"="cafe"]` },
  { slug: 'park',   query: `way["leisure"="park"]` },
  { slug: 'sports', query: `node["leisure"="pitch"]` },
  { slug: 'hobby',  query: `node["amenity"="community_centre"]` },
]

async function seed(bbox: string) {  // bbox = "south,west,north,east"
  for (const { slug, query } of CATEGORY_QUERIES) {
    const venues = await fetchVenuesFromOverpass(query, bbox)
    // upsert into venues table using osm_id
  }
}
```

## 2.2 Overpass helper (`lib/venues/overpass.ts`)

```typescript
export async function fetchVenuesFromOverpass(
  query: string,
  bbox: string
): Promise<RawOSMVenue[]>
// Calls OVERPASS_API_URL, parses elements[], returns name + lat/lng + tags
```

## 2.3 Popularity score derivation

Initial score derived from OSM data heuristics:
- Has opening hours → +1
- Has phone/website → +1
- Has `wheelchair=yes` → +0.5
- Node has >3 tags → +1
- Capped at 10.

This is a placeholder — Epoch 5 upgrades this with real user signal.

## Epoch 2 Checklist

- [ ] `lib/venues/overpass.ts` implemented
- [ ] `db/venues/seed.ts` runnable with a bounding box
- [ ] Seed run for at least one city (Bengaluru default)
- [ ] Venues table populated with >100 rows to test against
- [ ] `OVERPASS_API_URL` added to env

---

---

# Epoch 3 — API Routes + UI Shell

**Goal:** Build the `/api/venues/nearby` endpoint and render the Spaces tab with a working
map + list. No filters or detail view yet — just the bare tab.

## 3.1 API route: `app/api/venues/nearby/route.ts`

```
GET /api/venues/nearby?lat=12.97&lng=77.59&radius=2000&category=cafe
```

Query logic (PostGIS):
```sql
SELECT
  v.id, v.name, v.address, v.popularity_score,
  ST_Y(v.location::geometry) AS lat,
  ST_X(v.location::geometry) AS lng,
  ST_Distance(v.location, ST_MakePoint($lng, $lat)::geography) AS distance_metres,
  c.slug AS category_slug, c.label AS category_label, c.emoji
FROM venues v
JOIN categories c ON c.id = v.category_id
WHERE ST_DWithin(
  v.location,
  ST_MakePoint($lng, $lat)::geography,
  $radius          -- metres
)
ORDER BY distance_metres ASC
LIMIT 40;
```

Response shape:
```json
{
  "venues": [
    {
      "id": 1,
      "name": "Blue Tokai Coffee",
      "lat": 12.972,
      "lng": 77.594,
      "distanceMetres": 320,
      "category": { "slug": "cafe", "label": "Café", "emoji": "☕" },
      "popularityScore": 7.5,
      "address": "Indiranagar, Bengaluru"
    }
  ]
}
```

## 3.2 Bottom nav: `components/BottomNav.tsx`

Mobile-first fixed bottom navigation. Two tabs:

```tsx
// Two tabs, icon + label, active state via usePathname()
// /map    → Activities tab  (🏃)
// /spaces → Spaces tab      (🗺)
```

Add `<BottomNav />` to `app/layout.tsx` so it persists across both tabs.
Add `pb-16` padding to page content wrappers to clear the nav bar.

## 3.3 Spaces page: `app/spaces/page.tsx`

Server Component. Gets user location from a client-side hook on first render.
Renders `SpacesMap` + `SpacesList` side-by-side (same layout as `/map`).

## 3.4 Map component: `SpacesMap.tsx` / `SpacesMapClient.tsx`

Same SSR-safe dynamic import pattern as existing `Map.tsx`.

Venue pin colours by category:
- Café → brown `#7B4F2E`
- Park → green `#2D7A3A`
- Sports → blue `#2563EB`
- Hobby → purple `#7C3AED`

On pin tap → opens `VenueSheet` (bottom sheet, mobile-friendly).

## 3.5 Venue list: `SpacesList.tsx` + `SpaceCard.tsx`

`SpaceCard` shows:
- Emoji + category pill
- Venue name
- Distance (e.g. "320 m away")
- Popularity score as filled dots (●●●○○)

## Epoch 3 Checklist

- [ ] `app/api/venues/nearby/route.ts` live and returning real data
- [ ] `BottomNav.tsx` added to layout
- [ ] `/spaces` page renders without crashing
- [ ] Venue pins visible on Leaflet map
- [ ] `SpaceCard` list renders below map
- [ ] Mobile layout tested at 390px width

---

---

# Epoch 4 — Filters, Detail Sheet & Polish

**Goal:** Category filters, a tappable detail bottom-sheet per venue, distance radius
slider, and loading skeletons. This epoch makes Spaces feel like a real feature.

## 4.1 Category filter pills: `SpacesFiltersBar.tsx`

Horizontally scrollable pill row (same style as `FiltersBar.tsx` in Activities).
Pills: All · ☕ Café · 🌳 Park · ⚽ Sports · 🎨 Hobby

Tapping a pill re-fetches `/api/venues/nearby` with `?category=<slug>`.

## 4.2 Radius slider

A compact slider in the filter bar: 500 m · 1 km · 2 km · 5 km.
Updates both map zoom and API query radius live.

## 4.3 Venue detail sheet: `VenueSheet.tsx`

Triggered by tapping a pin **or** a `SpaceCard`. Slides up from the bottom (CSS
`translate-y` transition, no third-party library needed).

Sheet content:
- Venue name + category emoji badge
- Address + distance
- Popularity score bar
- OSM tags displayed as readable chips (opening hours, phone, wheelchair, etc.)
- **"Happening here"** — links to any active Third Space *activities* at the same location
  (cross-query from Supabase activities DB using lat/lng proximity)
- **Vibe tags** — user-submitted one-tap tags (see 4.4)
- Link to OSM page for full details

## 4.4 Vibe tags (user-generated)

Users can tap a tag to upvote it (no account required for voting, but the tag
contribution is stored against the venue in the `venue_tags` table seeded in Epoch 1).

API route: `POST /api/venues/[id]/tags` — increments `count` on existing tag or inserts new.

Suggested default tags per category:
- Café: quiet · good wifi · power outlets · outdoor seating · dog friendly
- Park: dog friendly · open late · walking paths · playground
- Sports: floodlit · booking required · open access
- Hobby: free entry · drop-in welcome · beginner friendly

## 4.5 Loading skeletons

`app/spaces/loading.tsx` — shimmer skeleton matching the map + list layout.

## Epoch 4 Checklist

- [ ] Category filter pills functional
- [ ] Radius slider wired to API
- [ ] `VenueSheet` opens on pin/card tap and closes on swipe-down or backdrop tap
- [ ] "Happening here" cross-links to activities correctly
- [ ] Vibe tags render and increment on tap
- [ ] `POST /api/venues/[id]/tags` route live
- [ ] Skeleton loader renders during fetch

---

---

# Epoch 5 — Popularity & Relevance Scoring Upgrade

**Goal:** Replace the static OSM heuristic score with a richer signal combining OSM data,
user activity (join counts), and vibe tag engagement. Make "Popular meetup spots" meaningful.

## 5.1 Scoring formula (server-side, recomputed on a schedule)

```
score = (
  osm_quality_score       * 0.3   -- opening hours, phone, website, tags count
  + activity_density_score * 0.4  -- # of Third Space activities at/near this venue in last 30 days
  + tag_engagement_score   * 0.3  -- total vibe tag votes / unique taggers
) * 10
```

`activity_density_score` requires a cross-DB query: query Supabase activities for
`ST_DWithin(activity.location, venue.location, 100m)`.

## 5.2 Score refresh

- Add a `score_updated_at` column to `venues`.
- Create a Next.js API route `POST /api/venues/refresh-scores` that recomputes and
  updates scores. Call it from a Vercel Cron Job (daily).

```json
// vercel.json
{
  "crons": [
    { "path": "/api/venues/refresh-scores", "schedule": "0 3 * * *" }
  ]
}
```

## 5.3 Sort order: "Popular near me"

Update `SpacesList` to offer two sort modes via a toggle:
- **Nearest** (default, distance ASC)
- **Popular** (popularity_score DESC then distance ASC)

## Epoch 5 Checklist

- [ ] Scoring formula implemented in `lib/venues/scoring.ts`
- [ ] `POST /api/venues/refresh-scores` route live and idempotent
- [ ] Vercel cron configured in `vercel.json`
- [ ] Sort toggle added to `SpacesFiltersBar`
- [ ] Score visually updated in `SpaceCard` and `VenueSheet`

---

---

## Summary Table

| Epoch | Delivers | Can ship without later epochs? |
|---|---|---|
| 1 | DB schema + types + client | Yes (backend only) |
| 2 | OSM data ingestion + seeder | Yes (backend only) |
| 3 | Spaces tab UI + API + bottom nav | Yes (needs Epoch 1+2 data) |
| 4 | Filters, detail sheet, vibe tags | Yes (incremental polish) |
| 5 | Smart popularity scoring | Yes (enhances existing UI) |

---

## Open Questions / Future Epochs (not scoped here)

- **Saved venues** — let users bookmark venues to their profile (extends Supabase `profiles`).
- **Venue photos** — pull OSM Mapillary street-level imagery or let users upload.
- **Search bar** — free-text search against venue names + addresses.
- **Data freshness** — automated weekly re-seed of OSM data to pick up new openings/closures.
- **Google Places enrichment** — optional layer on top of OSM if richer review data is needed (requires API key, paid).