-- BulletAI migration: add identifier color + manual sort order to goals.
-- Run this in the Supabase SQL Editor after 000_current_schema.sql.
-- Safe to run multiple times.

alter table public.goals
  add column if not exists color text,
  add column if not exists sort_order double precision;

-- Backfill a stable initial order for existing rows so manual sorting has a
-- starting point. Newest goals get the smallest value (shown first), matching
-- the previous "newest on top" behaviour.
update public.goals
set sort_order = -extract(epoch from created_at)
where sort_order is null;

-- Refresh PostgREST schema cache so the new columns are queryable immediately.
notify pgrst, 'reload schema';
