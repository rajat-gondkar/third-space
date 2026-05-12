-- Third-Space V1 schema. Run this in the Supabase SQL editor.
-- Safe to run on a fresh project. Idempotent where possible.

------------------------------------------------------------------------------
-- 1. Tables
------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.activities (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  description      text,
  category         text not null check (category in ('sport','study','food','hobby','other')),
  lat              double precision not null,
  lng              double precision not null,
  location_name    text,
  start_time       timestamptz not null,
  max_participants int  not null check (max_participants between 2 and 50),
  created_at       timestamptz not null default now()
);

create index if not exists activities_start_time_idx on public.activities (start_time);
create index if not exists activities_geo_idx        on public.activities (lat, lng);

create table if not exists public.participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id)   on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index if not exists participants_user_idx on public.participants (user_id);

------------------------------------------------------------------------------
-- 2. Row-Level Security
------------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.activities   enable row level security;
alter table public.participants enable row level security;

-- profiles: anyone authenticated can read, only owner can update
drop policy if exists "profiles read all"   on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

create policy "profiles read all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- activities: anyone authenticated can read, must be host to write/delete
drop policy if exists "activities read all"     on public.activities;
drop policy if exists "activities insert host"  on public.activities;
drop policy if exists "activities update host"  on public.activities;
drop policy if exists "activities delete host"  on public.activities;

create policy "activities read all"
  on public.activities for select
  to authenticated
  using (true);

create policy "activities insert host"
  on public.activities for insert
  to authenticated
  with check (host_id = auth.uid());

create policy "activities update host"
  on public.activities for update
  to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "activities delete host"
  on public.activities for delete
  to authenticated
  using (host_id = auth.uid());

-- participants: anyone authenticated can read, only the row's user can insert/delete
drop policy if exists "participants read all"   on public.participants;
drop policy if exists "participants insert own" on public.participants;
drop policy if exists "participants delete own" on public.participants;

create policy "participants read all"
  on public.participants for select
  to authenticated
  using (true);

create policy "participants insert own"
  on public.participants for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "participants delete own"
  on public.participants for delete
  to authenticated
  using (user_id = auth.uid());

------------------------------------------------------------------------------
-- 3. Auto-create a profile when a user signs up
------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

------------------------------------------------------------------------------
-- 4. Auto-add the host as a participant when an activity is created
------------------------------------------------------------------------------

create or replace function public.add_host_as_participant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.participants (activity_id, user_id)
  values (new.id, new.host_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_activity_created on public.activities;
create trigger on_activity_created
  after insert on public.activities
  for each row execute procedure public.add_host_as_participant();

------------------------------------------------------------------------------
-- 5. Atomic join (prevents race on max_participants)
------------------------------------------------------------------------------

create or replace function public.join_activity(p_activity uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_max   int;
  v_count int;
  v_user  uuid := auth.uid();
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

  insert into public.participants (activity_id, user_id)
  values (p_activity, v_user)
  on conflict do nothing;

  return 'ok';
end;
$$;

grant execute on function public.join_activity(uuid) to authenticated;

------------------------------------------------------------------------------
-- 6. Realtime
------------------------------------------------------------------------------

-- Add tables to the supabase_realtime publication so the client can subscribe.
-- These are no-ops if already present.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activities'
  ) then
    alter publication supabase_realtime add table public.activities;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;
end $$;
