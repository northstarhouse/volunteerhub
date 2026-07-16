-- Moves the In-Kind (Work) / Monetary Value classification from the
-- sponsor-level "Sponsors" row down to each individual "Sponsor In-Kind"
-- contribution entry, since a sponsor can give multiple contributions of
-- different types over time (e.g. a cash gift one year, work another).
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).

alter table "Sponsor In-Kind" add column if not exists contribution_type text;

alter table "Sponsor In-Kind" drop constraint if exists sponsor_inkind_contribution_type_check;
alter table "Sponsor In-Kind" add constraint sponsor_inkind_contribution_type_check
  check (contribution_type is null or contribution_type in ('In-Kind (Work)', 'Monetary Value', 'Discount'));

-- The earlier sponsor-level tag is superseded by the per-entry one above;
-- safe to drop since Financial Overview no longer reads it.
alter table "Sponsors" drop constraint if exists sponsors_sponsor_type_check;
alter table "Sponsors" drop column if exists sponsor_type;
