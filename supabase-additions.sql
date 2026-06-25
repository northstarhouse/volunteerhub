-- NSH Volunteer Hub — schema additions
-- Run in Supabase SQL Editor (north-star-portal project)
-- Safe to run multiple times.

-- Links Supabase Auth users to their record in "2026 Volunteers"
-- NOTE: "2026 Volunteers".id is a bigint, so volunteer_id must be bigint too
drop table if exists volunteer_auth_links cascade;
create table volunteer_auth_links (
  auth_user_id uuid    primary key references auth.users(id) on delete cascade,
  volunteer_id bigint  not null,
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
create policy "read own link"   on volunteer_auth_links for select to authenticated using (auth.uid() = auth_user_id);
create policy "insert own link" on volunteer_auth_links for insert to authenticated with check (auth.uid() = auth_user_id);
create policy "update own link" on volunteer_auth_links for update to authenticated using (auth.uid() = auth_user_id);

-- vol_feedback: volunteers can insert; no public read (admins use service role)
drop policy if exists "insert feedback" on vol_feedback;
create policy "insert feedback" on vol_feedback for insert to authenticated with check (auth.uid() = auth_user_id);

-- "2026 Volunteers" update policy (allows volunteers to edit their own record)
drop policy if exists "Volunteers can update own record" on "2026 Volunteers";
create policy "Volunteers can update own record"
  on "2026 Volunteers"
  for update
  to authenticated
  using (
    exists (
      select 1 from public.volunteer_auth_links
      where volunteer_auth_links.auth_user_id = auth.uid()
      and   volunteer_auth_links.volunteer_id  = "2026 Volunteers".id
    )
  )
  with check (
    exists (
      select 1 from public.volunteer_auth_links
      where volunteer_auth_links.auth_user_id = auth.uid()
      and   volunteer_auth_links.volunteer_id  = "2026 Volunteers".id
    )
  );

-- New column for volunteer future vision (safe to run if already added)
alter table "2026 Volunteers" add column if not exists "NSH Future Vision" text;
