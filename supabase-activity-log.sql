-- Recent Activity feed — Volunteer Hub actions surfaced on Portal's home page.
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
-- Safe to run multiple times.

create table if not exists activity_log (
  id             bigint generated always as identity primary key,
  volunteer_name text,
  volunteer_id   bigint,
  auth_user_id   uuid references auth.users(id) on delete set null,
  action         text not null,   -- e.g. 'profile_updated', 'reimbursement_submitted'
  description    text not null,   -- human-readable, e.g. "Jane Doe updated her profile"
  created_at     timestamptz default now()
);

alter table activity_log enable row level security;

-- Portal reads this with the anon key (no per-user session) — same pattern
-- other Portal-visible tables use.
drop policy if exists "anyone read activity" on activity_log;
create policy "anyone read activity"
on activity_log
for select
to anon, authenticated
using (true);

-- Only signed-in volunteers can write entries, and only ones attributed to themselves.
drop policy if exists "volunteers insert own activity" on activity_log;
create policy "volunteers insert own activity"
on activity_log
for insert
to authenticated
with check (auth_user_id = auth.uid());
