-- Migrate an existing BulletAI database to the v2 domain schema.
--
-- Take a full database and Storage backup before running this migration. It
-- intentionally removes soft-deleted rows and obsolete columns. Run during a
-- maintenance window because the affected tables are locked for the duration.

begin;

lock table
  auth.users,
  public.profiles,
  public.moments,
  public.reflections,
  public.goals,
  public.habits,
  public.habit_checkins,
  public.ai_usage_events
in share row exclusive mode;

-- Stop legacy triggers from rewriting timestamps while data is backfilled.
drop trigger if exists update_profiles_updated_at on public.profiles;
drop trigger if exists update_moments_updated_at on public.moments;
drop trigger if exists update_reflections_updated_at on public.reflections;
drop trigger if exists update_goals_updated_at on public.goals;
drop trigger if exists update_habits_updated_at on public.habits;
drop trigger if exists update_habit_checkins_updated_at on public.habit_checkins;
drop trigger if exists resolve_habit_checkin_reference on public.habit_checkins;

-- Add the v2 columns before converting legacy data.
alter table public.profiles
  add column if not exists version bigint default 1;

alter table public.moments
  add column if not exists occurred_on date,
  add column if not exists version bigint default 1;

alter table public.reflections
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists version bigint default 1;

alter table public.goals
  add column if not exists completed_at timestamptz,
  add column if not exists version bigint default 1;

alter table public.habits
  add column if not exists started_on date,
  add column if not exists version bigint default 1;

alter table public.habit_checkins
  add column if not exists version bigint default 1;

-- Repair the one-to-one invariant before profile values are normalized.
insert into public.profiles (user_id)
select users.id
from auth.users users
on conflict (user_id) do nothing;

-- Display names are not handles. Drop either historical uniqueness shape before
-- trimming values, otherwise whitespace-only differences could block backfill.
drop index if exists public.profiles_username_idx;
alter table public.profiles
  drop constraint if exists profiles_username_key;

-- A deleted tombstone is no longer application data in the hard-delete model.
-- A false check-in represented an unchecked state and is now represented by no
-- row at all.
delete from public.habit_checkins
where deleted_at is not null or checked is not true;

delete from public.habits where deleted_at is not null;
delete from public.moments where deleted_at is not null;
delete from public.reflections where deleted_at is not null;
delete from public.goals where deleted_at is not null;

-- Normalize retained data and preserve stable client identifiers.
update public.profiles
set
  username = nullif(btrim(username), ''),
  preferred_language = case
    when preferred_language in ('zh', 'en') then preferred_language
    else 'zh'
  end,
  accent_color = case
    when accent_color in ('sage', 'green', 'purple', 'amber') then accent_color
    else 'sage'
  end,
  color_scheme = case
    when color_scheme in ('system', 'light', 'dark') then color_scheme
    else 'system'
  end,
  completed_goal_retention = case
    when completed_goal_retention in ('instant', 'next_day', 'never')
      then completed_goal_retention
    else 'next_day'
  end,
  week_starts_on = case
    when week_starts_on in ('auto', 'monday', 'sunday', 'saturday')
      then week_starts_on
    else 'auto'
  end,
  version = greatest(coalesce(version, 1), 1),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

update public.moments
set
  client_id = coalesce(nullif(btrim(client_id), ''), 'moment-' || id::text),
  content = coalesce(nullif(btrim(content), ''), 'Untitled moment'),
  occurred_on = coalesce(occurred_on, created_at::date, current_date),
  version = greatest(coalesce(version, 1), 1),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

update public.reflections
set
  client_id = coalesce(
    nullif(btrim(client_id), ''),
    'reflection-' || id::text
  ),
  title = coalesce(
    nullif(btrim(title), ''),
    nullif(left(btrim(split_part(content, E'\n\n', 1)), 100), ''),
    nullif(left(btrim(body), 100), ''),
    'Untitled'
  ),
  body = coalesce(
    nullif(btrim(body), ''),
    nullif(btrim(content), ''),
    'Untitled'
  ),
  version = greatest(coalesce(version, 1), 1),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

update public.goals
set
  client_id = coalesce(nullif(btrim(client_id), ''), 'goal-' || id::text),
  title = coalesce(nullif(btrim(title), ''), 'Untitled goal'),
  description = coalesce(description, ''),
  sort_order = coalesce(
    sort_order,
    -extract(epoch from coalesce(created_at, now()))
  ),
  completed_at = case
    when completed_at is not null then completed_at
    when status = 'completed' or coalesce(progress, 0) >= 100
      then coalesce(updated_at, created_at, now())
    else null
  end,
  version = greatest(coalesce(version, 1), 1),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

update public.habits
set
  client_id = coalesce(nullif(btrim(client_id), ''), 'habit-' || id::text),
  name = coalesce(nullif(btrim(name), ''), 'Untitled habit'),
  frequency = case
    when frequency in ('weekly', 'Weekly', '每周') then 'weekly'
    else 'daily'
  end,
  started_on = coalesce(started_on, created_at::date, current_date),
  version = greatest(coalesce(version, 1), 1),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

-- Some early deployments only kept the latest check-in on the habit row. The
-- historical migrations normally copied it already; this guard preserves it
-- when that backfill was skipped.
insert into public.habit_checkins (
  user_id,
  habit_id,
  client_id,
  habit_client_id,
  checked_on,
  checked,
  version,
  created_at,
  updated_at
)
select
  habits.user_id,
  habits.id,
  'habit-checkin-legacy-' || habits.id::text || '-' || habits.last_checkin::date,
  habits.client_id,
  habits.last_checkin::date,
  true,
  1,
  habits.last_checkin,
  habits.last_checkin
from public.habits habits
where habits.last_checkin is not null
  and not exists (
    select 1
    from public.habit_checkins checkins
    where checkins.user_id = habits.user_id
      and checkins.habit_id = habits.id
      and checkins.checked_on = habits.last_checkin::date
      and checkins.checked is true
      and checkins.deleted_at is null
  );

-- Re-resolve check-in references from the bigint FK before replacing the old
-- globally unique client-id model with per-user uniqueness.
update public.habit_checkins checkins
set
  client_id = coalesce(
    nullif(btrim(checkins.client_id), ''),
    'habit-checkin-' || checkins.id::text
  ),
  habit_client_id = habits.client_id,
  version = greatest(coalesce(checkins.version, 1), 1),
  created_at = coalesce(checkins.created_at, now()),
  updated_at = coalesce(checkins.updated_at, checkins.created_at, now())
from public.habits habits
where checkins.habit_id = habits.id
  and checkins.user_id = habits.user_id;

delete from public.habit_checkins checkins
where not exists (
  select 1
  from public.habits habits
  where habits.id = checkins.habit_id
    and habits.user_id = checkins.user_id
);

-- Keep the oldest row if legacy data contains duplicate check-ins for a day.
delete from public.habit_checkins newer
using public.habit_checkins older
where newer.id > older.id
  and newer.user_id = older.user_id
  and newer.habit_client_id = older.habit_client_id
  and newer.checked_on = older.checked_on;

-- Remove constraints and indexes that depend on the legacy columns/model.
alter table public.profiles
  drop constraint if exists profiles_ui_theme_check;
alter table public.goals
  drop constraint if exists goals_status_check,
  drop constraint if exists goals_progress_check;
alter table public.habit_checkins
  drop constraint if exists habit_checkins_habit_client_id_fkey,
  drop constraint if exists habit_checkins_user_habit_day_unique;

drop index if exists public.profiles_user_id_idx;
drop index if exists public.moments_user_id_idx;
drop index if exists public.moments_client_id_idx;
drop index if exists public.reflections_user_id_idx;
drop index if exists public.reflections_client_id_idx;
drop index if exists public.goals_user_id_idx;
drop index if exists public.goals_client_id_idx;
drop index if exists public.goals_user_due_date_idx;
drop index if exists public.goals_user_sort_order_idx;
drop index if exists public.habits_user_id_idx;
drop index if exists public.habits_client_id_idx;
drop index if exists public.habit_checkins_client_id_idx;
drop index if exists public.habit_checkins_user_checked_on_idx;
drop index if exists public.habit_checkins_habit_checked_on_idx;

-- Drop columns that encoded soft deletion or unused legacy capabilities.
alter table public.profiles
  drop column if exists ui_theme,
  drop column if exists username_updated_at,
  drop column if exists preferences_updated_at;

alter table public.moments
  drop column if exists deleted_at;

alter table public.reflections
  drop column if exists content,
  drop column if exists source,
  drop column if exists source_type,
  drop column if exists location,
  drop column if exists image_path,
  drop column if exists deleted_at;

alter table public.goals
  drop column if exists status,
  drop column if exists progress,
  drop column if exists image_path,
  drop column if exists deleted_at;

alter table public.habits
  drop column if exists image_path,
  drop column if exists last_checkin,
  drop column if exists checkin_count,
  drop column if exists deleted_at;

alter table public.habit_checkins
  drop column if exists checked,
  drop column if exists deleted_at;

-- Align defaults/nullability and install explicit v2 constraints.
alter table public.profiles
  alter column username drop not null,
  alter column preferred_language set default 'zh',
  alter column preferred_language set not null,
  alter column accent_color set default 'sage',
  alter column accent_color set not null,
  alter column color_scheme set default 'system',
  alter column color_scheme set not null,
  alter column completed_goal_retention set default 'next_day',
  alter column completed_goal_retention set not null,
  alter column week_starts_on set default 'auto',
  alter column week_starts_on set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.moments
  alter column client_id set not null,
  alter column content set not null,
  alter column occurred_on set default current_date,
  alter column occurred_on set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.reflections
  alter column client_id set not null,
  alter column title set not null,
  alter column body set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.goals
  alter column client_id set not null,
  alter column title set not null,
  alter column description set default '',
  alter column description set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.habits
  alter column client_id set not null,
  alter column name set not null,
  alter column frequency set default 'daily',
  alter column frequency set not null,
  alter column started_on set default current_date,
  alter column started_on set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.habit_checkins
  alter column client_id set not null,
  alter column habit_id set not null,
  alter column habit_client_id set not null,
  alter column checked_on set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.profiles
  drop constraint if exists profiles_preferred_language_check,
  drop constraint if exists profiles_accent_color_check,
  drop constraint if exists profiles_color_scheme_check,
  drop constraint if exists profiles_completed_goal_retention_check,
  drop constraint if exists profiles_week_starts_on_check;
alter table public.habits
  drop constraint if exists habits_frequency_check;

alter table public.profiles
  add constraint profiles_preferred_language_check
    check (preferred_language in ('zh', 'en')),
  add constraint profiles_accent_color_check
    check (accent_color in ('sage', 'green', 'purple', 'amber')),
  add constraint profiles_color_scheme_check
    check (color_scheme in ('system', 'light', 'dark')),
  add constraint profiles_completed_goal_retention_check
    check (completed_goal_retention in ('instant', 'next_day', 'never')),
  add constraint profiles_week_starts_on_check
    check (week_starts_on in ('auto', 'monday', 'sunday', 'saturday')),
  add constraint profiles_username_not_blank
    check (username is null or btrim(username) <> ''),
  add constraint profiles_version_positive check (version >= 1);

alter table public.moments
  add constraint moments_user_client_id_unique unique (user_id, client_id),
  add constraint moments_client_id_not_blank check (btrim(client_id) <> ''),
  add constraint moments_content_not_blank check (btrim(content) <> ''),
  add constraint moments_version_positive check (version >= 1);

alter table public.reflections
  add constraint reflections_user_client_id_unique unique (user_id, client_id),
  add constraint reflections_client_id_not_blank check (btrim(client_id) <> ''),
  add constraint reflections_title_not_blank check (btrim(title) <> ''),
  add constraint reflections_body_not_blank check (btrim(body) <> ''),
  add constraint reflections_version_positive check (version >= 1);

alter table public.goals
  add constraint goals_user_client_id_unique unique (user_id, client_id),
  add constraint goals_client_id_not_blank check (btrim(client_id) <> ''),
  add constraint goals_title_not_blank check (btrim(title) <> ''),
  add constraint goals_version_positive check (version >= 1);

alter table public.habits
  add constraint habits_user_client_id_unique unique (user_id, client_id),
  add constraint habits_client_id_not_blank check (btrim(client_id) <> ''),
  add constraint habits_name_not_blank check (btrim(name) <> ''),
  add constraint habits_frequency_check check (frequency in ('daily', 'weekly')),
  add constraint habits_version_positive check (version >= 1);

alter table public.habit_checkins
  add constraint habit_checkins_user_client_id_unique
    unique (user_id, client_id),
  add constraint habit_checkins_user_habit_day_unique
    unique (user_id, habit_client_id, checked_on),
  add constraint habit_checkins_habit_client_id_fkey
    foreign key (user_id, habit_client_id)
    references public.habits(user_id, client_id) on delete cascade,
  add constraint habit_checkins_client_id_not_blank
    check (btrim(client_id) <> ''),
  add constraint habit_checkins_version_positive check (version >= 1);

-- Rebuild indexes around stable cursor queries and current product views.
create index moments_history_idx
  on public.moments(user_id, occurred_on desc, created_at desc, client_id desc);
create index reflections_history_idx
  on public.reflections(user_id, updated_at desc, client_id desc);
create index goals_open_order_idx
  on public.goals(user_id, sort_order, created_at desc, client_id)
  where completed_at is null;
create index goals_completed_history_idx
  on public.goals(user_id, completed_at desc, client_id)
  where completed_at is not null;
create index goals_due_date_idx
  on public.goals(user_id, due_date, client_id);
create index habits_history_idx
  on public.habits(user_id, created_at desc, client_id);
create index habit_checkins_user_history_idx
  on public.habit_checkins(user_id, checked_on desc, client_id);
create index habit_checkins_habit_history_idx
  on public.habit_checkins(habit_id, checked_on desc);

-- Resolve and validate both habit identifiers on every relationship write.
drop function if exists public.resolve_habit_checkin_reference();
create function public.resolve_habit_checkin_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  resolved_habit_id bigint;
  resolved_client_id text;
begin
  if new.habit_client_id is not null then
    select id, client_id
      into resolved_habit_id, resolved_client_id
    from public.habits
    where user_id = new.user_id
      and client_id = new.habit_client_id;
  elsif new.habit_id is not null then
    select id, client_id
      into resolved_habit_id, resolved_client_id
    from public.habits
    where user_id = new.user_id
      and id = new.habit_id;
  end if;

  if resolved_habit_id is null then
    raise foreign_key_violation using
      message = 'Habit check-in must reference a habit owned by the same user';
  end if;

  new.habit_id = resolved_habit_id;
  new.habit_client_id = resolved_client_id;
  return new;
end;
$$;

create trigger resolve_habit_checkin_reference
  before insert or update of user_id, habit_id, habit_client_id
  on public.habit_checkins
  for each row execute function public.resolve_habit_checkin_reference();

drop function if exists public.update_updated_at_column();
create or replace function public.advance_entity_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$;

create trigger advance_profiles_version
  before update on public.profiles
  for each row execute function public.advance_entity_version();
create trigger advance_moments_version
  before update on public.moments
  for each row execute function public.advance_entity_version();
create trigger advance_reflections_version
  before update on public.reflections
  for each row execute function public.advance_entity_version();
create trigger advance_goals_version
  before update on public.goals
  for each row execute function public.advance_entity_version();
create trigger advance_habits_version
  before update on public.habits
  for each row execute function public.advance_entity_version();
create trigger advance_habit_checkins_version
  before update on public.habit_checkins
  for each row execute function public.advance_entity_version();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Replace the caller-controlled AI quota RPC with a fixed server-side policy.
drop function if exists public.reserve_ai_usage_event(uuid, timestamptz, int);
drop function if exists public.reserve_ai_usage_event();
create function public.reserve_ai_usage_event()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  event_count integer;
begin
  if current_user_id is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ai_usage_events:' || current_user_id::text, 0)
  );

  delete from public.ai_usage_events
  where user_id = current_user_id
    and created_at < now() - interval '24 hours';

  select count(*) into event_count
  from public.ai_usage_events
  where user_id = current_user_id
    and created_at >= now() - interval '1 hour';

  if event_count >= 20 then
    return false;
  end if;

  insert into public.ai_usage_events (user_id) values (current_user_id);
  return true;
end;
$$;

revoke all on function public.reserve_ai_usage_event() from public;
grant execute on function public.reserve_ai_usage_event() to authenticated;

-- RLS remains the only browser-facing authorization boundary.
alter table public.profiles enable row level security;
alter table public.moments enable row level security;
alter table public.reflections enable row level security;
alter table public.goals enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.ai_usage_events enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using ((select auth.uid()) = user_id);
create policy "Users can insert own profile"
  on public.profiles for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can select own moments" on public.moments;
drop policy if exists "Users can insert own moments" on public.moments;
drop policy if exists "Users can update own moments" on public.moments;
drop policy if exists "Users can delete own moments" on public.moments;
create policy "Users can select own moments"
  on public.moments for select using ((select auth.uid()) = user_id);
create policy "Users can insert own moments"
  on public.moments for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own moments"
  on public.moments for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own moments"
  on public.moments for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own reflections" on public.reflections;
drop policy if exists "Users can insert own reflections" on public.reflections;
drop policy if exists "Users can update own reflections" on public.reflections;
drop policy if exists "Users can delete own reflections" on public.reflections;
create policy "Users can select own reflections"
  on public.reflections for select using ((select auth.uid()) = user_id);
create policy "Users can insert own reflections"
  on public.reflections for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own reflections"
  on public.reflections for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own reflections"
  on public.reflections for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own goals" on public.goals;
drop policy if exists "Users can insert own goals" on public.goals;
drop policy if exists "Users can update own goals" on public.goals;
drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can select own goals"
  on public.goals for select using ((select auth.uid()) = user_id);
create policy "Users can insert own goals"
  on public.goals for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own goals"
  on public.goals for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own goals"
  on public.goals for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own habits" on public.habits;
drop policy if exists "Users can insert own habits" on public.habits;
drop policy if exists "Users can update own habits" on public.habits;
drop policy if exists "Users can delete own habits" on public.habits;
create policy "Users can select own habits"
  on public.habits for select using ((select auth.uid()) = user_id);
create policy "Users can insert own habits"
  on public.habits for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own habits"
  on public.habits for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own habits"
  on public.habits for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own habit checkins" on public.habit_checkins;
drop policy if exists "Users can insert own habit checkins" on public.habit_checkins;
drop policy if exists "Users can update own habit checkins" on public.habit_checkins;
drop policy if exists "Users can delete own habit checkins" on public.habit_checkins;
create policy "Users can select own habit checkins"
  on public.habit_checkins for select using ((select auth.uid()) = user_id);
create policy "Users can insert own habit checkins"
  on public.habit_checkins for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own habit checkins"
  on public.habit_checkins for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own habit checkins"
  on public.habit_checkins for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own AI usage events"
  on public.ai_usage_events;
drop policy if exists "Users can insert own AI usage events"
  on public.ai_usage_events;
create policy "Users can select own AI usage events"
  on public.ai_usage_events for select using ((select auth.uid()) = user_id);

-- Restrict browser Storage access to the only remaining media capability.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'moments',
  'moments',
  false,
  5242880,
  array['image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own stored files" on storage.objects;
drop policy if exists "Users can upload own stored files" on storage.objects;
drop policy if exists "Users can update own stored files" on storage.objects;
drop policy if exists "Users can delete own stored files" on storage.objects;
drop policy if exists "Users can read own moment images" on storage.objects;
drop policy if exists "Users can upload own moment images" on storage.objects;
drop policy if exists "Users can update own moment images" on storage.objects;
drop policy if exists "Users can delete own moment images" on storage.objects;

create policy "Users can read own moment images"
  on storage.objects for select
  using (
    bucket_id = 'moments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can upload own moment images"
  on storage.objects for insert
  with check (
    bucket_id = 'moments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can update own moment images"
  on storage.objects for update
  using (
    bucket_id = 'moments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'moments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "Users can delete own moment images"
  on storage.objects for delete
  using (
    bucket_id = 'moments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

notify pgrst, 'reload schema';

commit;
