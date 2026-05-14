-- Third-Space migration 0004 — seamless account linking via college email.
-- When a user signs in with a college email that’s already verified on another
-- profile, the new auth user merges into that existing profile so activities,
-- participants, and all data follow the canonical identity.
--
-- Idempotent. Apply via Supabase SQL editor.

------------------------------------------------------------------------------
-- 1. Add ON UPDATE CASCADE to FKs referencing profiles(id)
------------------------------------------------------------------------------

DO $$
BEGIN
  -- activities.host_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activities_host_id_fkey'
      AND table_name = 'activities'
  ) THEN
    ALTER TABLE public.activities
      DROP CONSTRAINT activities_host_id_fkey;
  END IF;

  ALTER TABLE public.activities
    ADD CONSTRAINT activities_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

  -- participants.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'participants_user_id_fkey'
      AND table_name = 'participants'
  ) THEN
    ALTER TABLE public.participants
      DROP CONSTRAINT participants_user_id_fkey;
  END IF;

  ALTER TABLE public.participants
    ADD CONSTRAINT participants_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

  -- college_email_verifications.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'college_email_verifications_user_id_fkey'
      AND table_name = 'college_email_verifications'
  ) THEN
    ALTER TABLE public.college_email_verifications
      DROP CONSTRAINT college_email_verifications_user_id_fkey;
  END IF;

  ALTER TABLE public.college_email_verifications
    ADD CONSTRAINT college_email_verifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

------------------------------------------------------------------------------
-- 2. Unique constraint on verified college emails
------------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS profiles_verified_college_email_idx
  ON public.profiles (college_email)
  WHERE college_email_verified = true;

------------------------------------------------------------------------------
-- 3. Updated handle_new_user trigger — merges into existing profile when
--    signing in with an already-verified college email
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  -- If this email is a verified college email already linked to another
  -- account, merge the new auth user into that existing profile so all
  -- activities, participants, and data stay unified.
  SELECT id INTO existing_id
    FROM public.profiles
   WHERE college_email = new.email
     AND college_email_verified = true;

  IF existing_id IS NOT NULL THEN
    -- Remove any stray auto-created profile for this new auth user id
    -- so the PK update below doesn't conflict.
    DELETE FROM public.profiles WHERE id = new.id;

    -- Transfer the existing profile to the new auth user id.
    -- ON UPDATE CASCADE propagates to activities, participants, etc.
    UPDATE public.profiles
       SET id = new.id,
           email = new.email,
           display_name = COALESCE(
             public.profiles.display_name,
             new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name'
           ),
           avatar_url = COALESCE(
             public.profiles.avatar_url,
             new.raw_user_meta_data->>'avatar_url'
           )
     WHERE id = existing_id;

    RETURN new;
  END IF;

  -- Otherwise, create a new profile as usual.
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  RETURN new;
END;
$$;

-- Trigger itself is unchanged; recreating for safety.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
