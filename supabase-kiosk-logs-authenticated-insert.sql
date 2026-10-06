-- Run this once in the Supabase SQL editor (project uvzwhhwzelaelfhfkvdb).
-- Same gap as supabase-kiosk-logs-authenticated-read.sql, on the write side:
-- kiosk_logs only had an INSERT policy for the "anon" role. Volunteer Hub's
-- "Add Missed Hours" sends the volunteer's login token, which PostgREST
-- evaluates as "authenticated", so every save was rejected by RLS
-- ("Failed to save. Please try again."). Mirrors the existing anon_insert.

drop policy if exists "authenticated_insert" on kiosk_logs;
create policy "authenticated_insert"
on kiosk_logs
for insert
to authenticated
with check (true);
