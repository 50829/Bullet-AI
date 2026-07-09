-- Treat profiles.username as a display name, not a globally unique handle.
-- Existing deployments may have either the table-level unique constraint from
-- early schema creation or the later explicit unique index.

drop index if exists public.profiles_username_idx;

alter table public.profiles
  drop constraint if exists profiles_username_key;

notify pgrst, 'reload schema';
