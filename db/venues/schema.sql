CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  osm_tags JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS venues (
  id BIGSERIAL PRIMARY KEY,
  osm_id BIGINT,
  osm_type TEXT NOT NULL DEFAULT 'node',
  name TEXT NOT NULL,
  category_id INT REFERENCES categories(id),
  location GEOGRAPHY(Point, 4326) NOT NULL,
  address TEXT,
  osm_tags JSONB NOT NULL DEFAULT '{}',
  popularity_score NUMERIC(4, 2) DEFAULT 0,
  score_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS venues_osm_type_osm_id_idx
  ON venues (osm_type, osm_id);
CREATE INDEX IF NOT EXISTS venues_location_idx ON venues USING GIST (location);
CREATE INDEX IF NOT EXISTS venues_category_idx ON venues (category_id);

CREATE TABLE IF NOT EXISTS venue_tags (
  id BIGSERIAL PRIMARY KEY,
  venue_id BIGINT REFERENCES venues(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  count INT DEFAULT 1,
  UNIQUE (venue_id, tag)
);

INSERT INTO categories (slug, label, emoji, osm_tags)
VALUES
  ('cafe', 'Cafe', '☕', '{"amenity": "cafe"}'),
  ('park', 'Park', '🌳', '{"leisure": "park"}'),
  ('sports', 'Sports Ground', '⚽', '{"leisure": "pitch"}'),
  ('hobby', 'Hobby Hub', '🎨', '{"amenity": "community_centre"}')
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  osm_tags = EXCLUDED.osm_tags;
