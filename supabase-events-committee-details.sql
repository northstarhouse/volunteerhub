-- Adds a free-text "Details" field to events_committee, for Pre-Planning's
-- Details section (open-ended planning notes, separate from the short
-- top-level "Description" shown on the event header).
-- Run in Supabase SQL Editor (north-star-portal project: uvzwhhwzelaelfhfkvdb).
-- Safe to run multiple times.

alter table events_committee add column if not exists details text;
