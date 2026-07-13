-- Run this once in the Supabase SQL editor (project uvzwhhwzelaelfhfkvdb).
-- Replaces the earlier per-area-scoped policy with a simple "any logged-in
-- volunteer can read Op Budget / Op Earnings" policy. The Volunteer Hub UI
-- still only shows each volunteer their own tagged area (matchVolunteerAreas
-- in src/lib/db.js) — this just removes the DB-level restriction, since none
-- of this data is sensitive (no donor info lives in these tables).

-- Clean up the old scoped policy + helper functions (safe if they don't exist).
drop policy if exists "volunteers read own area budget" on "Op Budget";
drop policy if exists "volunteers read own area earnings" on "Op Earnings";
drop function if exists public.nsh_current_volunteer_areas();
drop function if exists public.nsh_volunteer_areas(text);

alter table "Op Budget" enable row level security;
alter table "Op Earnings" enable row level security;

drop policy if exists "authenticated read budget" on "Op Budget";
create policy "authenticated read budget"
on "Op Budget"
for select
to authenticated
using (true);

drop policy if exists "authenticated read earnings" on "Op Earnings";
create policy "authenticated read earnings"
on "Op Earnings"
for select
to authenticated
using (true);
