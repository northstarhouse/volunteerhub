-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- Tables are prefixed with "vol_" to avoid conflicts with other apps in this project.

create table if not exists vol_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date text,
  time text,
  description text,
  created_at timestamptz default now()
);

create table if not exists vol_event_responses (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references vol_events(id) on delete cascade,
  name text not null,
  response text not null,
  created_at timestamptz default now()
);

create table if not exists vol_polls (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  options text[] not null,
  created_at timestamptz default now()
);

create table if not exists vol_poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references vol_polls(id) on delete cascade,
  name text not null,
  option text not null,
  created_at timestamptz default now()
);

create table if not exists vol_shifts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date text,
  time text,
  duration text,
  role text,
  spots integer,
  created_at timestamptz default now()
);

create table if not exists vol_shift_signups (
  id uuid default gen_random_uuid() primary key,
  shift_id uuid references vol_shifts(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table vol_events enable row level security;
alter table vol_event_responses enable row level security;
alter table vol_polls enable row level security;
alter table vol_poll_votes enable row level security;
alter table vol_shifts enable row level security;
alter table vol_shift_signups enable row level security;

create policy "public read"   on vol_events           for select using (true);
create policy "public insert" on vol_events           for insert with check (true);
create policy "public delete" on vol_events           for delete using (true);

create policy "public read"   on vol_event_responses  for select using (true);
create policy "public insert" on vol_event_responses  for insert with check (true);

create policy "public read"   on vol_polls            for select using (true);
create policy "public insert" on vol_polls            for insert with check (true);
create policy "public delete" on vol_polls            for delete using (true);

create policy "public read"   on vol_poll_votes       for select using (true);
create policy "public insert" on vol_poll_votes       for insert with check (true);

create policy "public read"   on vol_shifts           for select using (true);
create policy "public insert" on vol_shifts           for insert with check (true);
create policy "public delete" on vol_shifts           for delete using (true);

create policy "public read"   on vol_shift_signups    for select using (true);
create policy "public insert" on vol_shift_signups    for insert with check (true);

-- Enable realtime
alter publication supabase_realtime add table vol_event_responses;
alter publication supabase_realtime add table vol_poll_votes;
alter publication supabase_realtime add table vol_shift_signups;
