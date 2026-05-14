-- Third-Space migration 0005 — bidirectional account linking via linked_user_id.
--
-- Reverts 0004's profile-id-moving approach (which broke the original Gmail
-- account) and replaces it with a stable canonical profile id + linked_user_id
-- column.  Whichever auth user created the profile first remains the
-- canonical owner; the other auth user is stored in linked_user_id.
--
-- All writes (activities, participants, profiles) resolve to the canonical
-- id via resolve_canonical_id() so both accounts share the same data.
--
-- Idempotent. Apply via Supabase SQL editor or direct Postgres.

------------------------------------------------------------------------------
-- 1. Revert 0004 FK changes (remove ON UPDATE CASCADE)
------------------------------------------------------------------------------

DO $$
BEGIN
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
    ON DELETE CASCADE;

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
    ON DELETE CASCADE;

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
    ON DELETE CASCADE;
END $$;

------------------------------------------------------------------------------
-- 2. Drop 0004 unique index on college_email
------------------------------------------------------------------------------

DROP INDEX IF EXISTS profiles_verified_college_email_idx;

------------------------------------------------------------------------------
-- 3. Add linked_user_id to profiles
------------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linked_user_id uuid;

CREATE INDEX IF NOT EXISTS profiles_linked_user_id_idx
  ON public.profiles (linked_user_id);

------------------------------------------------------------------------------
-- 4. resolve_canonical_id() helper
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_canonical_id(p_auth_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.profiles WHERE linked_user_id = p_auth_id),
    p_auth_id
  );
$$;

------------------------------------------------------------------------------
-- 5. handle_new_user trigger — link instead of moving
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- If this auth ID is already linked to a profile, don't create duplicate.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE linked_user_id = new.id
  ) THEN
    RETURN new;
  END IF;

  -- If this email is a verified college email on an existing profile,
  -- link the new auth user to that profile.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE college_email = new.email
      AND college_email_verified = true
  ) THEN
    UPDATE public.profiles
       SET linked_user_id = new.id
     WHERE college_email = new.email
       AND college_email_verified = true;
    RETURN new;
  END IF;

  -- Otherwise create a new profile.
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
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

------------------------------------------------------------------------------
-- 6. Normalise activity host_id to canonical id on insert
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_activity_host()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  new.host_id := public.resolve_canonical_id(new.host_id);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_activity_insert_normalize_host ON public.activities;
CREATE TRIGGER on_activity_insert_normalize_host
  BEFORE INSERT ON public.activities
  FOR EACH ROW EXECUTE PROCEDURE public.normalize_activity_host();

------------------------------------------------------------------------------
-- 7. Auto-add host as participant using canonical id
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_host_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.participants (activity_id, user_id)
  VALUES (new.id, public.resolve_canonical_id(new.host_id))
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;

-- Recreate the trigger (dropped implicitly when function was replaced)
DROP TRIGGER IF EXISTS on_activity_created ON public.activities;
CREATE TRIGGER on_activity_created
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE PROCEDURE public.add_host_as_participant();

------------------------------------------------------------------------------
-- 8. join_activity RPC using canonical id
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.join_activity(uuid);
DROP FUNCTION IF EXISTS public.join_activity(uuid, text);

CREATE OR REPLACE FUNCTION public.join_activity(
  p_activity     uuid,
  p_display_name text default null
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_max   int;
  v_count int;
  v_user  uuid;
  v_name  text := nullif(trim(p_display_name), '');
BEGIN
  v_user := public.resolve_canonical_id(auth.uid());

  if v_user is null then
    return 'not_found';
  end if;

  select max_participants into v_max
    from public.activities
   where id = p_activity
   for update;

  if v_max is null then
    return 'not_found';
  end if;

  if exists (
    select 1 from public.participants
     where activity_id = p_activity and user_id = v_user
  ) then
    return 'already_joined';
  end if;

  select count(*) into v_count
    from public.participants
   where activity_id = p_activity;

  if v_count >= v_max then
    return 'full';
  end if;

  insert into public.participants (activity_id, user_id, display_name)
  values (p_activity, v_user, v_name)
  on conflict do nothing;

  if v_name is not null then
    update public.profiles
       set display_name = v_name
     where id = v_user
       and (display_name is null or display_name = '');
  end if;

  return 'ok';
end;
$$;

grant execute on function public.join_activity(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- 9. Update RLS policies to use canonical id
------------------------------------------------------------------------------

-- profiles: update own (or linked)
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own"
  ON public.profiles FOR update
  TO authenticated
  USING (id = public.resolve_canonical_id(auth.uid()))
  WITH CHECK (id = public.resolve_canonical_id(auth.uid()));

-- activities: insert host
DROP POLICY IF EXISTS "activities insert host" ON public.activities;
CREATE POLICY "activities insert host"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (host_id = public.resolve_canonical_id(auth.uid()));

-- activities: update host
DROP POLICY IF EXISTS "activities update host" ON public.activities;
CREATE POLICY "activities update host"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (host_id = public.resolve_canonical_id(auth.uid()))
  WITH CHECK (host_id = public.resolve_canonical_id(auth.uid()));

-- activities: delete host
DROP POLICY IF EXISTS "activities delete host" ON public.activities;
CREATE POLICY "activities delete host"
  ON public.activities FOR DELETE
  TO authenticated
  USING (host_id = public.resolve_canonical_id(auth.uid()));

-- participants: insert own
DROP POLICY IF EXISTS "participants insert own" ON public.participants;
CREATE POLICY "participants insert own"
  ON public.participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.resolve_canonical_id(auth.uid()));

-- participants: delete own
DROP POLICY IF EXISTS "participants delete own" ON public.participants;
CREATE POLICY "participants delete own"
  ON public.participants FOR DELETE
  TO authenticated
  USING (user_id = public.resolve_canonical_id(auth.uid()));
