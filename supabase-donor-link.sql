-- Run this once in the Supabase SQL editor (project uvzwhhwzelaelfhfkvdb).
-- Lets a signed-in volunteer read their OWN linked donor record + donation
-- history (Portal now supports linking a "2026 Volunteers" row to a donors
-- row via donor_id). Scoped tightly: a volunteer can only ever see the donor
-- row that their own account is linked to, never anyone else's giving data.
-- Also opens "List Tag Colors" (just tag-name -> hex color pairs, no
-- sensitive data) for authenticated read so the Hub can color-match a
-- volunteer's own Event Tags the same way Portal does.

drop policy if exists "volunteers read own linked donor" on donors;
create policy "volunteers read own linked donor"
on donors
for select
to authenticated
using (
  exists (
    select 1 from "2026 Volunteers" v
    where v.donor_id = donors.id
      and (
        v.auth_user_id = auth.uid()
        or exists (
          select 1 from volunteer_auth_links val
          where val.auth_user_id = auth.uid() and val.volunteer_id = v.id
        )
      )
  )
);

drop policy if exists "volunteers read own linked donations" on donations;
create policy "volunteers read own linked donations"
on donations
for select
to authenticated
using (
  exists (
    select 1 from "2026 Volunteers" v
    where v.donor_id = donations.donor_id
      and (
        v.auth_user_id = auth.uid()
        or exists (
          select 1 from volunteer_auth_links val
          where val.auth_user_id = auth.uid() and val.volunteer_id = v.id
        )
      )
  )
);

alter table "List Tag Colors" enable row level security;
drop policy if exists "authenticated read list tag colors" on "List Tag Colors";
create policy "authenticated read list tag colors"
on "List Tag Colors"
for select
to authenticated
using (true);
