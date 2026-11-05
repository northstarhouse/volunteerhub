-- Private ongoing to-do checklist on the media@ (Haley) Volunteer Hub dashboard.
-- Only the signed-in media@thenorthstarhouse.org account can read or change these rows.
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb). Safe to run multiple times.

create table if not exists public.media_checklist (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.media_checklist enable row level security;

drop policy if exists "media checklist owner" on public.media_checklist;
create policy "media checklist owner" on public.media_checklist
  for all to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'media@thenorthstarhouse.org')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'media@thenorthstarhouse.org');

-- optional due date
alter table public.media_checklist add column if not exists due_date date;
