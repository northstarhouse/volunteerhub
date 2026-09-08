-- Adds a unified "checklist" field to events_committee, replacing the
-- separate Task checklist / Budget sections in Pre-Planning with one list
-- where each item can optionally carry an estimated/actual $ amount and
-- notes, alongside the existing done/text/due/assignee/priority fields.
-- The app migrates any existing tasks/budget rows into this field the
-- first time each event loads after this column exists (see fromDb/load
-- in EventsCommittee.jsx), then clears the old tasks/budget arrays so the
-- migration only happens once per event.
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
-- Safe to run multiple times.

alter table events_committee add column if not exists checklist jsonb not null default '[]';
