-- Third-Space migration — venue submissions + admin approval workflow.
-- Users can suggest new spaces; admins review and approve/reject.
--
-- Idempotent. Apply via Supabase SQL editor or direct Postgres.

------------------------------------------------------------------------------
-- 1. Submissions table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS venue_submissions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL CHECK (category_slug IN ('cafe','park','sports','hobby')),
  tags TEXT[] DEFAULT '{}',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS venue_submissions_status_idx
  ON venue_submissions (status);
CREATE INDEX IF NOT EXISTS venue_submissions_created_at_idx
  ON venue_submissions (created_at DESC);

------------------------------------------------------------------------------
-- 2. Helper: approve a submission by inserting into venues
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION approve_venue_submission(p_submission_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission venue_submissions%ROWTYPE;
  v_category_id INT;
  v_new_venue_id BIGINT;
BEGIN
  SELECT * INTO v_submission
    FROM venue_submissions
   WHERE id = p_submission_id
     AND status = 'pending';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_category_id
    FROM categories
   WHERE slug = v_submission.category_slug;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO venues (
    osm_id,
    osm_type,
    name,
    category_id,
    location,
    address,
    osm_tags,
    popularity_score,
    avg_rating,
    rating_count,
    created_at,
    updated_at
  ) VALUES (
    NULL,
    'node',
    v_submission.name,
    v_category_id,
    ST_SetSRID(ST_MakePoint(v_submission.lng, v_submission.lat), 4326)::geography,
    v_submission.address,
    '{}',
    0,
    0,
    0,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_venue_id;

  UPDATE venue_submissions
     SET status = 'approved'
   WHERE id = p_submission_id;

  RETURN v_new_venue_id;
END;
$$;
