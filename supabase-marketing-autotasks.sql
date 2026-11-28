-- Auto-populating marketing tasks on Haley's (media@) "My Checklist" in the Volunteer Hub.
-- Three sources feed media_checklist:
--   event      countdown tasks from published site_events (editable template: marketing_event_steps)
--   monthly    the Portal's Monthly Posting Schedule items (marketing_posting_items), synced both ways
--              with marketing_posting_log so checking either place checks the other
--   quarterly  one post per area (Events, Construction, Grounds, Development) showing its latest goals
-- generate_marketing_tasks() is idempotent; pg_cron runs it daily and the Hub's Refresh button calls it.
-- Project: uvzwhhwzelaelfhfkvdb. Safe to run multiple times.

-- 1. Columns on the checklist -------------------------------------------------------------
alter table public.media_checklist add column if not exists source text;          -- event | monthly | quarterly | null (typed by hand)
alter table public.media_checklist add column if not exists source_ref text;      -- event id | 'YYYY-MM' | 'YYYY-Qn:Area'
alter table public.media_checklist add column if not exists template_key text;
alter table public.media_checklist add column if not exists details jsonb;
alter table public.media_checklist add column if not exists generated_due date;   -- the date the template gives; used to move tasks when an event's date changes
alter table public.media_checklist add column if not exists archived_at timestamptz;
alter table public.media_checklist add column if not exists catch_up boolean not null default false;

create unique index if not exists media_checklist_generated_key
  on public.media_checklist (source, source_ref, template_key) where source is not null;

-- 2. Editable templates ----------------------------------------------------------------------
create table if not exists public.marketing_event_steps (
  key text primary key,
  task text not null,
  offset_days integer not null,   -- negative = before the event, positive = after
  sort integer not null default 0,
  active boolean not null default true
);
create table if not exists public.marketing_posting_items (
  key text primary key,           -- matches marketing_posting_log.item_key and the Portal's POSTING_SCHEDULE
  task text not null,
  sort integer not null default 0,
  active boolean not null default true
);
alter table public.marketing_event_steps enable row level security;
alter table public.marketing_posting_items enable row level security;
drop policy if exists "read marketing steps" on public.marketing_event_steps;
create policy "read marketing steps" on public.marketing_event_steps for select to anon, authenticated using (true);
drop policy if exists "media edits marketing steps" on public.marketing_event_steps;
create policy "media edits marketing steps" on public.marketing_event_steps for all to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'media@thenorthstarhouse.org')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'media@thenorthstarhouse.org');
drop policy if exists "read posting items" on public.marketing_posting_items;
create policy "read posting items" on public.marketing_posting_items for select to anon, authenticated using (true);
drop policy if exists "media edits posting items" on public.marketing_posting_items;
create policy "media edits posting items" on public.marketing_posting_items for all to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'media@thenorthstarhouse.org')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'media@thenorthstarhouse.org');

insert into public.marketing_event_steps (key, task, offset_days, sort) values
  ('page-live',  'Event page live and ticket link ready',   -42, 1),
  ('announce',   'Announcement post and flyer',             -28, 2),
  ('newsletter', 'Newsletter mention, Google Ads check',    -21, 3),
  ('reminder',   'Reminder post, community calendar listings', -14, 4),
  ('final-push', 'Final push post and stories',              -7, 5),
  ('thank-you',  'Thank-you post and photo selects',          1, 6)
on conflict (key) do nothing;

insert into public.marketing_posting_items (key, task, sort) values
  ('newsletter-send',       'Newsletter Send Out', 1),
  ('wedding-post',          'Wedding Post', 2),
  ('history-testimonial',   'History or Testimonial', 3),
  ('join-newsletter',       'Join Our Newsletter', 4),
  ('volunteer-events',      'Volunteer Outreach: Events', 5),
  ('volunteer-restoration', 'Volunteer Outreach: Restoration', 6),
  ('volunteer-garden',      'Volunteer Outreach: Garden', 7),
  ('volunteer-docents',     'Volunteer Outreach: Docents', 8),
  ('sponsor-spotlight',     'Sponsor Spotlight', 9),
  ('upcoming-event-tours',  'Upcoming Event / Tours', 10),
  ('planning-update',       'Planning Update', 11),
  ('video',                 'Video', 12),
  ('development-board',     'Development / Board Update', 13)
on conflict (key) do nothing;

-- 3. Generator -------------------------------------------------------------------------------
create or replace function public.generate_marketing_tasks()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Los_Angeles')::date;
  mstart date := date_trunc('month', today)::date;
  mkey text := to_char(today, 'YYYY-MM');
  mondays date[];
  qyear int := extract(year from today)::int;
  qnum int := extract(quarter from today)::int;
  qstart date := date_trunc('quarter', today)::date;
  qdue date;
  ev record; st record; it record; ar record; g record; u record;
  due date; n_ins int := 0; i int := 0;
  go_live constant date := '2026-11-28';  -- steps and months that were already past when this launched are skipped
begin
  -- Only Haley's account, the service role, or the database itself (pg_cron) may run this.
  if not (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'media@thenorthstarhouse.org'
    or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  ) then
    raise exception 'not allowed';
  end if;

  -- Event countdown ------------------------------------------------------------
  for ev in
    select id, title, (start_at at time zone coalesce(nullif(time_zone, ''), 'America/Los_Angeles'))::date as d
    from site_events
    where status = 'published' and start_at is not null and not coalesce(date_tbd, false)
      and (start_at at time zone 'America/Los_Angeles')::date >= today - 3
  loop
    for st in select * from marketing_event_steps where active order by sort loop
      due := ev.d + st.offset_days;
      continue when due < go_live;
      insert into media_checklist (text, due_date, generated_due, source, source_ref, template_key, details, catch_up)
      values (st.task, greatest(due, today), due, 'event', ev.id::text, st.key,
              jsonb_build_object('event_title', ev.title, 'event_date', ev.d), due < today)
      on conflict (source, source_ref, template_key) where source is not null do nothing;
      if found then n_ins := n_ins + 1; end if;
    end loop;
    -- Date moved: shift the open tasks to match.
    update media_checklist c set
        due_date = greatest(ev.d + s.offset_days, today),
        generated_due = ev.d + s.offset_days,
        details = coalesce(c.details, '{}'::jsonb) || jsonb_build_object('event_title', ev.title, 'event_date', ev.d),
        archived_at = null
      from marketing_event_steps s
      where c.source = 'event' and c.source_ref = ev.id::text and c.template_key = s.key
        and not c.done
        and c.generated_due is distinct from ev.d + s.offset_days;
  end loop;
  -- Canceled (unpublished or deleted before it happened): archive open tasks, never delete.
  update media_checklist c set archived_at = now()
    where c.source = 'event' and not c.done and c.archived_at is null
      and not exists (
        select 1 from site_events e where e.id::text = c.source_ref
          and (e.status = 'published' or (e.status = 'archived' and e.start_at < now()))
      );

  -- Monthly posting items, spread across the month's Mondays (Haley's marketing day) ----
  select array_agg(d::date order by d) into mondays
    from generate_series(mstart, (mstart + interval '1 month' - interval '1 day')::date, interval '1 day') d
    where extract(isodow from d) = 1;
  for it in select * from marketing_posting_items where active and mstart > go_live order by sort loop
    due := mondays[(i % array_length(mondays, 1)) + 1];
    i := i + 1;
    insert into media_checklist (text, due_date, generated_due, source, source_ref, template_key, done, done_at, catch_up)
    select it.task, greatest(due, today), due, 'monthly', mkey, it.key,
           coalesce(l.done, false), case when l.done then coalesce(l.updated_at, now()) end, due < today
      from (select 1) x left join marketing_posting_log l on l.month = mkey and l.item_key = it.key
    on conflict (source, source_ref, template_key) where source is not null do nothing;
    if found then n_ins := n_ins + 1; end if;
  end loop;

  -- Quarterly area posts -------------------------------------------------------
  qdue := (qstart + interval '1 month' + interval '14 days')::date;  -- mid second month of the quarter
  for ar in select * from (values ('Events','Events',1), ('Construction','Construction',2), ('Grounds','Grounds',3), ('Fundraising','Development',4)) v(area, label, sort) loop
    select * into g from "Op Quarter Goals" where area = ar.area
      order by year desc, quarter desc, created_at desc limit 1;
    select * into u from "Op Quarterly Updates" where area = ar.area and g.year is not null and year = g.year and quarter = g.quarter
      order by created_at desc limit 1;
    insert into media_checklist (text, due_date, generated_due, source, source_ref, template_key, catch_up)
    values ('Quarterly post: ' || ar.label, greatest(qdue, today), qdue, 'quarterly',
            qyear || '-Q' || qnum || ':' || ar.area, 'area-post', qdue < today)
    on conflict (source, source_ref, template_key) where source is not null do nothing;
    if found then n_ins := n_ins + 1; end if;
    -- Keep the goals current until the post is done.
    update media_checklist set details = jsonb_build_object(
        'area', ar.label,
        'goals_quarter', case when g.year is null then null else g.quarter || ' ' || g.year end,
        'stale', g.year is null or g.year < qyear or (g.year = qyear and g.quarter < ('Q' || qnum)),
        'primary_focus', g.primary_focus,
        'goals', case when g.year is null then '[]'::jsonb else jsonb_build_array(
            jsonb_build_object('text', g.goal_1, 'status', nullif(g.goal_1_status, ''), 'summary', nullif(g.goal_1_summary, '')),
            jsonb_build_object('text', g.goal_2, 'status', nullif(g.goal_2_status, ''), 'summary', nullif(g.goal_2_summary, '')),
            jsonb_build_object('text', g.goal_3, 'status', nullif(g.goal_3_status, ''), 'summary', nullif(g.goal_3_summary, ''))) end,
        'extra_goals', coalesce(to_jsonb(g.extra_goals), '[]'::jsonb),
        'successes', nullif(u.successes, ''))
      where source = 'quarterly' and source_ref = qyear || '-Q' || qnum || ':' || ar.area and not done;
  end loop;

  return jsonb_build_object('created', n_ins);
end;
$$;
revoke all on function public.generate_marketing_tasks() from public, anon;
grant execute on function public.generate_marketing_tasks() to authenticated;

-- 4. Two-way sync with the Portal's Monthly Posting Schedule ----------------------------------
create or replace function public.media_checklist_to_posting_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'monthly' and new.done is distinct from old.done then
    insert into marketing_posting_log (month, item_key, done, updated_at)
    values (new.source_ref, new.template_key, new.done, now())
    on conflict (month, item_key) do update set done = excluded.done, updated_at = now()
      where marketing_posting_log.done is distinct from excluded.done;
  end if;
  return new;
end; $$;
drop trigger if exists media_checklist_posting_sync on public.media_checklist;
create trigger media_checklist_posting_sync after update of done on public.media_checklist
  for each row execute function public.media_checklist_to_posting_log();

create or replace function public.posting_log_to_media_checklist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update media_checklist set done = new.done, done_at = case when new.done then now() end
    where source = 'monthly' and source_ref = new.month and template_key = new.item_key
      and done is distinct from new.done;
  return new;
end; $$;
drop trigger if exists posting_log_checklist_sync on public.marketing_posting_log;
create trigger posting_log_checklist_sync after insert or update of done on public.marketing_posting_log
  for each row execute function public.posting_log_to_media_checklist();

-- 5. Daily run (6:05 AM Pacific standard time) ---------------------------------------------
select cron.unschedule('generate-marketing-tasks') where exists (select 1 from cron.job where jobname = 'generate-marketing-tasks');
select cron.schedule('generate-marketing-tasks', '5 14 * * *', 'select public.generate_marketing_tasks()');
