-- Third-Space migration 0008 — Threads and thread posts.
-- Idempotent. Apply via Supabase SQL editor.

------------------------------------------------------------------------------
-- 1. Threads table (tied to venues, but stored in main DB for RLS + realtime)
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        BIGINT NOT NULL, -- references venues DB (no FK because separate DB)
  name            TEXT NOT NULL,
  location_name   TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  category_slug   TEXT,
  category_emoji  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS threads_venue_id_idx ON public.threads (venue_id);
CREATE INDEX IF NOT EXISTS threads_location_idx ON public.threads (lat, lng);

------------------------------------------------------------------------------
-- 2. Thread posts table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.thread_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(content) <= 2000),
  image_urls      TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS thread_posts_thread_idx ON public.thread_posts (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS thread_posts_user_idx   ON public.thread_posts (user_id);

------------------------------------------------------------------------------
-- 3. Row-Level Security
------------------------------------------------------------------------------

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_posts ENABLE ROW LEVEL SECURITY;

-- threads: anyone authenticated can read; insert is open (system/populate)
DROP POLICY IF EXISTS "threads read all"   ON public.threads;
DROP POLICY IF EXISTS "threads insert"     ON public.threads;

CREATE POLICY "threads read all"
  ON public.threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "threads insert"
  ON public.threads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- thread_posts: anyone authenticated can read; only author can write/delete
DROP POLICY IF EXISTS "thread_posts read all"   ON public.thread_posts;
DROP POLICY IF EXISTS "thread_posts insert own" ON public.thread_posts;
DROP POLICY IF EXISTS "thread_posts update own" ON public.thread_posts;
DROP POLICY IF EXISTS "thread_posts delete own" ON public.thread_posts;

CREATE POLICY "thread_posts read all"
  ON public.thread_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "thread_posts insert own"
  ON public.thread_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "thread_posts update own"
  ON public.thread_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "thread_posts delete own"
  ON public.thread_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

------------------------------------------------------------------------------
-- 4. Post-images storage bucket
------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anyone can view post-images" ON storage.objects;
CREATE POLICY "anyone can view post-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "authenticated can upload post-images" ON storage.objects;
CREATE POLICY "authenticated can upload post-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-images');

DROP POLICY IF EXISTS "users can delete own post-images" ON storage.objects;
CREATE POLICY "users can delete own post-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

------------------------------------------------------------------------------
-- 5. Realtime
------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'thread_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_posts;
  END IF;
END $$;
