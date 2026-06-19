-- Historical BulletAI migration: add identifier color + manual sort order to goals.
-- These columns are now included in 000_current_schema.sql for fresh installs.
-- Keep this file for older deployments that already ran a previous 000 script.
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
