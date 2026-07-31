-- Area-based planning data for Events Committee events. One row per
-- (event, area), replacing the old flat Preplanning/After tabs with a
-- 9-area model (Overall/Programs/Volunteers/Logistics/Hospitality/Finance/
-- Sponsorship/Interiors/Marketing), each carrying its own pre-event and
-- post-event field data as jsonb (shapes defined client-side).

create table if not exists events_committee_areas (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events_committee(id) on delete cascade,
  area_key     text not null check (area_key in ('overall','programs','volunteers','logistics','hospitality','finance','sponsorship','interiors','marketing')),
  owner_name   text,
  pre_data     jsonb not null default '{}',
  post_data    jsonb not null default '{}',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) on delete set null,
  unique (event_id, area_key)
);

alter table events_committee_areas enable row level security;

create policy "authenticated read events_committee_areas" on events_committee_areas for select to authenticated using (true);
create policy "authenticated insert events_committee_areas" on events_committee_areas for insert to authenticated with check (true);
create policy "authenticated update events_committee_areas" on events_committee_areas for update to authenticated using (true) with check (true);
create policy "authenticated delete events_committee_areas" on events_committee_areas for delete to authenticated using (true);

-- Formalize a column that already exists live but was never captured in a
-- migration file (added directly via SQL editor earlier this session).
alter table events_committee add column if not exists in_house_event_id uuid;
