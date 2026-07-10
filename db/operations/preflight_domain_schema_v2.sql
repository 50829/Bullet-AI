-- Read-only preflight for 005_domain_schema_v2.sql.
-- Run and save all result sets before taking the final backup and migrating.

-- Rows retained versus physically removed by the migration.
select
  'moments' as resource,
  count(*) as total_rows,
  count(*) filter (where deleted_at is null) as retained_rows,
  count(*) filter (where deleted_at is not null) as removed_rows
from public.moments
union all
select
  'reflections',
  count(*),
  count(*) filter (where deleted_at is null),
  count(*) filter (where deleted_at is not null)
from public.reflections
union all
select
  'goals',
  count(*),
  count(*) filter (where deleted_at is null),
  count(*) filter (where deleted_at is not null)
from public.goals
union all
select
  'habits',
  count(*),
  count(*) filter (where deleted_at is null),
  count(*) filter (where deleted_at is not null)
from public.habits
union all
select
  'habit_checkins',
  count(*),
  count(*) filter (
    where checkins.deleted_at is null
      and checkins.checked is true
      and exists (
        select 1
        from public.habits habits
        where habits.id = checkins.habit_id
          and habits.deleted_at is null
      )
  ),
  count(*) filter (
    where checkins.deleted_at is not null
      or checkins.checked is not true
      or not exists (
        select 1
        from public.habits habits
        where habits.id = checkins.habit_id
          and habits.deleted_at is null
      )
  )
from public.habit_checkins checkins
order by resource;

-- Non-empty values in columns that will be converted or removed.
select 'profiles.ui_theme' as legacy_field, count(*) as populated_rows
from public.profiles
where nullif(btrim(ui_theme), '') is not null
union all
select 'profiles.username_updated_at', count(*)
from public.profiles
where username_updated_at is not null
union all
select 'profiles.preferences_updated_at', count(*)
from public.profiles
where preferences_updated_at is not null
union all
select 'reflections.content', count(*)
from public.reflections
where nullif(btrim(content), '') is not null
union all
select 'reflections.source', count(*)
from public.reflections
where nullif(btrim(source), '') is not null
union all
select 'reflections.source_type', count(*)
from public.reflections
where nullif(btrim(source_type), '') is not null
union all
select 'reflections.location', count(*)
from public.reflections
where nullif(btrim(location), '') is not null
union all
select 'reflections.image_path', count(*)
from public.reflections
where nullif(btrim(image_path), '') is not null
union all
select 'goals.status=completed', count(*)
from public.goals
where status = 'completed'
union all
select 'goals.progress>=100', count(*)
from public.goals
where coalesce(progress, 0) >= 100
union all
select 'goals.image_path', count(*)
from public.goals
where nullif(btrim(image_path), '') is not null
union all
select 'habits.last_checkin', count(*)
from public.habits
where last_checkin is not null
union all
select 'habits.checkin_count>0', count(*)
from public.habits
where coalesce(checkin_count, 0) > 0
union all
select 'habits.image_path', count(*)
from public.habits
where nullif(btrim(image_path), '') is not null
order by legacy_field;

-- Storage inventory. Use scripts/audit-storage.mjs for recursive object paths
-- and reference matching through the supported Storage API.
select
  buckets.id as bucket,
  count(objects.name) as object_count,
  max(objects.created_at) as newest_object_at
from storage.buckets buckets
left join storage.objects objects on objects.bucket_id = buckets.id
where buckets.id in ('moments', 'reflections', 'goals', 'habits')
group by buckets.id
order by buckets.id;
