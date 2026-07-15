-- Events Committee Planning Notes — persistent storage
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
-- Safe to run multiple times.
--
-- Nested collections (tasks, budget, vendors, timeline, after-action notes)
-- are stored as JSONB rather than separate tables — this tool is a fast
-- planning scratchpad for the Events committee, not a system of record, and
-- a single table keeps the app's read/write code simple (matches how this
-- app already stores things like receipt_url as JSON elsewhere).

create table if not exists events_committee (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  date                 date,                          -- null = "needs a date"
  start_time           text,                           -- 'HH:MM' 24hr
  end_time             text,
  location             text,
  description          text,
  status               text not null default 'planning',
  purpose              text,
  expected_attendance  text,
  pricing              text,
  guest_invited        integer not null default 0,
  guest_confirmed      integer not null default 0,
  tasks                jsonb not null default '[]',
  budget               jsonb not null default '[]',
  vendors              jsonb not null default '[]',
  timeline             jsonb not null default '[]',
  after_notes          jsonb not null default '{}',
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table events_committee drop constraint if exists events_committee_status_check;
alter table events_committee add constraint events_committee_status_check
  check (status in ('planning','upcoming','needs_review','completed'));

-- Keep updated_at current on every write.
create or replace function events_committee_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_committee_updated_at on events_committee;
create trigger events_committee_updated_at
  before update on events_committee
  for each row execute function events_committee_set_updated_at();

alter table events_committee enable row level security;

-- Shared committee planning data — any signed-in volunteer can read/write.
-- (Page access itself is already gated client-side to volunteers tagged to
-- the Events team; this isn't sensitive financial/personal data the way
-- Op Budget or reimbursements are, so RLS here stays permissive rather than
-- trying to replicate the client's team-tag matching logic in SQL.)
drop policy if exists "authenticated read events_committee" on events_committee;
create policy "authenticated read events_committee"
on events_committee for select to authenticated using (true);

drop policy if exists "authenticated insert events_committee" on events_committee;
create policy "authenticated insert events_committee"
on events_committee for insert to authenticated with check (true);

drop policy if exists "authenticated update events_committee" on events_committee;
create policy "authenticated update events_committee"
on events_committee for update to authenticated using (true) with check (true);

drop policy if exists "authenticated delete events_committee" on events_committee;
create policy "authenticated delete events_committee"
on events_committee for delete to authenticated using (true);
