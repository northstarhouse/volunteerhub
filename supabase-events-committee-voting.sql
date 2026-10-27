-- Events Committee voting (same idea as the Board's voting in the Portal).
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb). Safe to run more than once.
--
-- Votes are hidden until every committee member has voted or the due date passes
-- (or someone closes the vote) -- that rule is enforced in the app, as it is for the Board.

create table if not exists events_vote_items (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  attachment_url   text,
  submitted_by     text,
  due_date         date,
  meeting_date     date,
  allow_notes_vote boolean not null default false,
  status           text not null default 'Open' check (status in ('Open', 'Closed')),
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create table if not exists events_votes (
  id                 uuid primary key default gen_random_uuid(),
  item_id            uuid not null references events_vote_items(id) on delete cascade,
  voter_id           text not null,           -- the volunteer's id
  voter              text not null,           -- display name
  choice             text not null check (choice in ('Yes', 'No', 'Abstain', 'Notes or Request Changes in Place of Vote')),
  note               text,
  changed_in_meeting boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (item_id, voter_id)
);

alter table events_vote_items enable row level security;
alter table events_votes enable row level security;

-- Signed-in volunteers only (same approach as events_committee).
drop policy if exists "authenticated read events_vote_items" on events_vote_items;
create policy "authenticated read events_vote_items" on events_vote_items for select to authenticated using (true);
drop policy if exists "authenticated insert events_vote_items" on events_vote_items;
create policy "authenticated insert events_vote_items" on events_vote_items for insert to authenticated with check (true);
drop policy if exists "authenticated update events_vote_items" on events_vote_items;
create policy "authenticated update events_vote_items" on events_vote_items for update to authenticated using (true) with check (true);
drop policy if exists "authenticated delete events_vote_items" on events_vote_items;
create policy "authenticated delete events_vote_items" on events_vote_items for delete to authenticated using (true);

drop policy if exists "authenticated read events_votes" on events_votes;
create policy "authenticated read events_votes" on events_votes for select to authenticated using (true);
drop policy if exists "authenticated insert events_votes" on events_votes;
create policy "authenticated insert events_votes" on events_votes for insert to authenticated with check (true);
drop policy if exists "authenticated update events_votes" on events_votes;
create policy "authenticated update events_votes" on events_votes for update to authenticated using (true) with check (true);
drop policy if exists "authenticated delete events_votes" on events_votes;
create policy "authenticated delete events_votes" on events_votes for delete to authenticated using (true);
