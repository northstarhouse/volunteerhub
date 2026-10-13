-- Adds an event lead name and a volunteers-needed headcount, shown in the
-- Overview tab's "Event details" card.
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
-- Safe to run multiple times.

alter table events_committee add column if not exists event_lead text;
alter table events_committee add column if not exists volunteers_needed integer;
