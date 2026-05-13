-- Third-Space migration 0002 — display names + emails on profiles/participants.
-- Idempotent. Apply via Supabase SQL editor (same way as 0001_init.sql).
--
-- Adds two columns:
--   profiles.email                — synced from auth.users (Google sign-in)
--   participants.display_name     — name the user picked when joining the activity
--
-- And updates:
--   trigger handle_new_user       — also copies the email on signup
--   function join_activity        — takes an optional display_name parameter

------------------------------------------------------------------------------
-- 1. Column additions
------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists email text;

alter table public.participants
  add column if not exists display_name text;

-- Backfill emails for existing profiles from auth.users (one-time).
update public.profiles p
   set email = u.email
  from auth.users u
 where p.id = u.id
   and (p.email is null or p.email = '');

------------------------------------------------------------------------------
-- 2. Updated handle_new_user trigger
------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    -- Don't clobber a display_name the user has customised later.
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url   = coalesce(public.profiles.avatar_url,   excluded.avatar_url);
  return new;
end;
$$;

-- Trigger itself is unchanged; recreating it for safety.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

------------------------------------------------------------------------------
-- 3. join_activity now accepts an optional display_name
------------------------------------------------------------------------------

-- Drop the old signature so we can replace it cleanly with the new arg list.
drop function if exists public.join_activity(uuid);
drop function if exists public.join_activity(uuid, text);

create or replace function public.join_activity(
  p_activity     uuid,
  p_display_name text default null
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_max   int;
  v_count int;
  v_user  uuid := auth.uid();
  v_name  text := nullif(trim(p_display_name), '');
begin
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

  -- Best-effort: keep the user's profile display_name in sync the first time
  -- they pick one, so future joins / hosting use the same name by default.
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
