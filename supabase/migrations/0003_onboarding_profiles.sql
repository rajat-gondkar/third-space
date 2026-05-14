-- Third-Space migration 0003 — onboarding + college email verification.
-- Idempotent. Apply via Supabase SQL editor.

------------------------------------------------------------------------------
-- 1. Add new columns to profiles
------------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS age int,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS college_email text,
  ADD COLUMN IF NOT EXISTS college_email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS college_name text,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

------------------------------------------------------------------------------
-- 2. College email OTP verification table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.college_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_email text NOT NULL,
  otp text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.college_email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage their own verifications" ON public.college_email_verifications;
CREATE POLICY "users can manage their own verifications"
  ON public.college_email_verifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS college_email_verifications_user_idx
  ON public.college_email_verifications (user_id);

------------------------------------------------------------------------------
-- 3. Avatars storage bucket
------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anyone can view avatars" ON storage.objects;
CREATE POLICY "anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "authenticated can upload avatars" ON storage.objects;
CREATE POLICY "authenticated can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "users can update own avatars" ON storage.objects;
CREATE POLICY "users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "users can delete own avatars" ON storage.objects;
CREATE POLICY "users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);