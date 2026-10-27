-- Events Committee voting: one listing, several separately-voted parts.
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb). Safe to run more than once.
-- An item with no parts is voted on as a whole, exactly as before.

create table if not exists events_vote_parts (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references events_vote_items(id) on delete cascade,
  title       text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table events_vote_parts enable row level security;
drop policy if exists "authenticated read events_vote_parts" on events_vote_parts;
create policy "authenticated read events_vote_parts" on events_vote_parts for select to authenticated using (true);
drop policy if exists "authenticated insert events_vote_parts" on events_vote_parts;
create policy "authenticated insert events_vote_parts" on events_vote_parts for insert to authenticated with check (true);
drop policy if exists "authenticated update events_vote_parts" on events_vote_parts;
create policy "authenticated update events_vote_parts" on events_vote_parts for update to authenticated using (true) with check (true);
drop policy if exists "authenticated delete events_vote_parts" on events_vote_parts;
create policy "authenticated delete events_vote_parts" on events_vote_parts for delete to authenticated using (true);

-- A vote can now belong to one part. part_id is null for votes on a whole item.
alter table events_votes add column if not exists part_id uuid references events_vote_parts(id) on delete cascade;
alter table events_votes drop constraint if exists events_votes_item_id_voter_id_key;
create unique index if not exists events_votes_whole_unique on events_votes (item_id, voter_id) where part_id is null;
create unique index if not exists events_votes_part_unique on events_votes (part_id, voter_id) where part_id is not null;
