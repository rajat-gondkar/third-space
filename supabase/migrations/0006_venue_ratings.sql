-- Third-Space migration — venue ratings system.
-- Adds venue_ratings table, avg_rating/rating_count columns on venues,
-- and updates popularity scoring to include user ratings.
--
-- Idempotent. Apply via Supabase SQL editor or direct Postgres.

------------------------------------------------------------------------------
-- 1. Ratings table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS venue_ratings (
  id BIGSERIAL PRIMARY KEY,
  venue_id BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (venue_id, user_id)
);

CREATE INDEX IF NOT EXISTS venue_ratings_venue_id_idx
  ON venue_ratings (venue_id);
CREATE INDEX IF NOT EXISTS venue_ratings_user_id_idx
  ON venue_ratings (user_id);

------------------------------------------------------------------------------
-- 2. Average rating columns on venues
------------------------------------------------------------------------------

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

------------------------------------------------------------------------------
-- 3. Recalculate average rating function
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalc_venue_rating(p_venue_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE venues
  SET avg_rating = COALESCE((
    SELECT AVG(rating)::numeric(3,2)
    FROM venue_ratings
    WHERE venue_id = p_venue_id
  ), 0),
  rating_count = (
    SELECT COUNT(*)
    FROM venue_ratings
    WHERE venue_id = p_venue_id
  )
  WHERE id = p_venue_id;
END;
$$;

------------------------------------------------------------------------------
-- 4. Trigger: auto-recalc avg_rating after insert/update/delete on ratings
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_recalc_venue_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_venue_id := OLD.venue_id;
  ELSE
    v_venue_id := NEW.venue_id;
  END IF;

  PERFORM recalc_venue_rating(v_venue_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS recalc_rating_on_change ON venue_ratings;
CREATE TRIGGER recalc_rating_on_change
  AFTER INSERT OR UPDATE OR DELETE ON venue_ratings
  FOR EACH ROW EXECUTE PROCEDURE trigger_recalc_venue_rating();

------------------------------------------------------------------------------
-- 5. Backfill avg_rating and rating_count for existing venues
------------------------------------------------------------------------------

DO $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN SELECT id FROM venues LOOP
    PERFORM recalc_venue_rating(v_row.id);
  END LOOP;
END $$;
