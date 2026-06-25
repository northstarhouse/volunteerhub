-- NSH Volunteer Hub — schema additions
-- Run in Supabase SQL Editor (north-star-portal project)
-- Safe to run multiple times.

-- Links Supabase Auth users to their record in "2026 Volunteers"
create table if not exists volunteer_auth_links (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  volunteer_id uuid,
  created_at   timestamptz default now()
);

-- Volunteer feedback / suggestions
create table if not exists vol_feedback (
  id             uuid default gen_random_uuid() primary key,
  auth_user_id   uuid references auth.users(id) on delete set null,
  volunteer_name text,
  category       text,
  message        text not null,
  anonymous      boolean default false,
  created_at     timestamptz default now()
);

-- Enable RLS
alter table volunteer_auth_links enable row level security;
alter table vol_feedback         enable row level security;

-- volunteer_auth_links: each user can only see and manage their own link
drop policy if exists "read own link"   on volunteer_auth_links;
drop policy if exists "insert own link" on volunteer_auth_links;
drop policy if exists "update own link" on volunteer_auth_links;
create policy "read own link"   on volunteer_auth_links for select using (auth.uid() = auth_user_id);
create policy "insert own link" on volunteer_auth_links for insert with check (auth.uid() = auth_user_id);
create policy "update own link" on volunteer_auth_links for update using (auth.uid() = auth_user_id);

-- vol_feedback: volunteers can insert their own; no public read (admins use service role)
drop policy if exists "insert feedback" on vol_feedback;
create policy "insert feedback" on vol_feedback for insert with check (auth.uid() = auth_user_id);

-- oot_notices: allow authenticated users to insert their own OOT notice
-- (run only if RLS is already enabled on oot_notices — check first)
-- drop policy if exists "authenticated insert oot" on oot_notices;
-- create policy "authenticated insert oot" on oot_notices for insert to authenticated with check (true);

-- "2026 Volunteers" — if RLS is enabled, add policies for authenticated volunteers:
-- Read all active volunteers (for directory, birthdays, etc.)
-- drop policy if exists "authenticated read volunteers" on "2026 Volunteers";
-- create policy "authenticated read volunteers" on "2026 Volunteers"
--   for select to authenticated using (true);
--
-- Update only their own record (matched via volunteer_auth_links)
-- drop policy if exists "update own volunteer record" on "2026 Volunteers";
-- create policy "update own volunteer record" on "2026 Volunteers"
--   for update to authenticated
--   using (id = (select volunteer_id from volunteer_auth_links where auth_user_id = auth.uid()));
