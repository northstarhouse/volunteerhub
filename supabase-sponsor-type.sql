-- Adds a classification tag to "Sponsors" so each sponsorship's "Fair Market
-- Value" (the combined total for that sponsor) can be tagged as either work
-- performed in-kind or an actual monetary value, instead of guessing from
-- free-text fields.
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).

alter table "Sponsors" add column if not exists sponsor_type text;

alter table "Sponsors" drop constraint if exists sponsors_sponsor_type_check;
alter table "Sponsors" add constraint sponsors_sponsor_type_check
  check (sponsor_type is null or sponsor_type in ('In-Kind (Work)', 'Monetary Value'));
