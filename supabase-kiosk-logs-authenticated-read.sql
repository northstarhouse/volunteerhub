-- Run this once in the Supabase SQL editor (project uvzwhhwzelaelfhfkvdb).
-- kiosk_logs only had a SELECT policy for the "anon" role. Portal reads it with
-- the anon key directly, so it always worked there -- but Volunteer Hub sends
-- each volunteer's real login token, which PostgREST evaluates as the
-- "authenticated" role, and there was no policy allowing that role to read at
-- all. Every Hours page load for a logged-in volunteer silently got zero rows
-- back. Non-sensitive data (just check-in/out timestamps + duty), same as the
-- existing anon policy, just extended to authenticated too.

drop policy if exists "authenticated_select" on kiosk_logs;
create policy "authenticated_select"
on kiosk_logs
for select
to authenticated
using (true);
