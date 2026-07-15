-- Events Committee: merge duplicate events + prevent future duplicates
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
--
-- Root cause: the app auto-syncs event names from Op Budget/Op Earnings on
-- every page load and inserts any name it doesn't already have. Without a
-- uniqueness guard, two near-simultaneous loads (e.g. two tabs, or React's
-- dev-mode double-invoke) could both decide a name was "missing" and both
-- insert it. Financial data (Op Budget/Op Earnings) is untouched by any of
-- this — it's read live by name, never stored in this table — so merging
-- or deleting duplicate rows here cannot lose or duplicate financial data.

-- ── Step 0: preview what will be merged (read-only, safe to run alone) ──────
select lower(btrim(name)) as name_key, count(*) as copies, array_agg(id order by created_at) as ids
from events_committee
group by lower(btrim(name))
having count(*) > 1;

-- ── Step 1: merge duplicates ─────────────────────────────────────────────
-- For each set of rows sharing a name (case/whitespace-insensitive): keep
-- the oldest row, union its task/budget/vendor/timeline lists with the
-- others' (so nothing entered on any copy is lost), fill in any blank
-- scalar fields from whichever copy has them, keep the most-advanced
-- status, and delete the now-redundant copies.
do $$
declare
  grp record;
  keep_id uuid;
begin
  for grp in
    select lower(btrim(name)) as name_key
    from events_committee
    group by lower(btrim(name))
    having count(*) > 1
  loop
    select id into keep_id
    from events_committee
    where lower(btrim(name)) = grp.name_key
    order by created_at asc
    limit 1;

    update events_committee k set
      date = coalesce(k.date, (
        select date from events_committee
        where lower(btrim(name)) = grp.name_key and date is not null
        order by created_at limit 1
      )),
      start_time = coalesce(nullif(k.start_time, ''), (
        select start_time from events_committee
        where lower(btrim(name)) = grp.name_key and start_time is not null and start_time <> ''
        order by created_at limit 1
      )),
      end_time = coalesce(nullif(k.end_time, ''), (
        select end_time from events_committee
        where lower(btrim(name)) = grp.name_key and end_time is not null and end_time <> ''
        order by created_at limit 1
      )),
      location = coalesce(nullif(k.location, ''), (
        select location from events_committee
        where lower(btrim(name)) = grp.name_key and location is not null and location <> ''
        order by created_at limit 1
      )),
      description = coalesce(nullif(k.description, ''), (
        select description from events_committee
        where lower(btrim(name)) = grp.name_key and description is not null and description <> ''
        order by created_at limit 1
      )),
      purpose = coalesce(nullif(k.purpose, ''), (
        select purpose from events_committee
        where lower(btrim(name)) = grp.name_key and purpose is not null and purpose <> ''
        order by created_at limit 1
      )),
      expected_attendance = coalesce(nullif(k.expected_attendance, ''), (
        select expected_attendance from events_committee
        where lower(btrim(name)) = grp.name_key and expected_attendance is not null and expected_attendance <> ''
        order by created_at limit 1
      )),
      pricing = coalesce(nullif(k.pricing, ''), (
        select pricing from events_committee
        where lower(btrim(name)) = grp.name_key and pricing is not null and pricing <> ''
        order by created_at limit 1
      )),
      guest_invited = (select coalesce(max(guest_invited), 0) from events_committee where lower(btrim(name)) = grp.name_key),
      guest_confirmed = (select coalesce(max(guest_confirmed), 0) from events_committee where lower(btrim(name)) = grp.name_key),
      status = (
        select status from events_committee
        where lower(btrim(name)) = grp.name_key
        order by case status
          when 'completed' then 4 when 'needs_review' then 3 when 'upcoming' then 2 else 1
        end desc
        limit 1
      ),
      tasks = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from events_committee e, jsonb_array_elements(e.tasks) elem
        where lower(btrim(e.name)) = grp.name_key
      ),
      budget = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from events_committee e, jsonb_array_elements(e.budget) elem
        where lower(btrim(e.name)) = grp.name_key
      ),
      vendors = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from events_committee e, jsonb_array_elements(e.vendors) elem
        where lower(btrim(e.name)) = grp.name_key
      ),
      timeline = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from events_committee e, jsonb_array_elements(e.timeline) elem
        where lower(btrim(e.name)) = grp.name_key
      )
    where k.id = keep_id;

    delete from events_committee
    where lower(btrim(name)) = grp.name_key and id <> keep_id;
  end loop;
end $$;

-- ── Step 2: prevent this from ever happening again ──────────────────────
-- Generated column + unique constraint on the normalized name, so the app
-- can safely upsert-and-ignore on conflict instead of racing.
alter table events_committee add column if not exists name_key text
  generated always as (lower(btrim(name))) stored;

alter table events_committee drop constraint if exists events_committee_name_key_unique;
alter table events_committee add constraint events_committee_name_key_unique unique (name_key);
