-- Run this once in the Supabase SQL editor (project uvzwhhwzelaelfhfkvdb).
-- Same fix as supabase-op-budget-rls.sql, applied to "Op Quarter Goals":
-- the old scoped policy depended on the nsh_current_volunteer_areas() /
-- nsh_volunteer_areas() helper functions dropped by that migration, which
-- silently broke authenticated reads (anon reads kept working, masking it).

drop policy if exists "volunteers read own area goals" on "Op Quarter Goals";
drop policy if exists "authenticated read goals" on "Op Quarter Goals";

alter table "Op Quarter Goals" enable row level security;

create policy "authenticated read goals"
on "Op Quarter Goals"
for select
to authenticated
using (true);
