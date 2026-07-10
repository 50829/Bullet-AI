begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

select results_eq(
  $$
    select (n.nspname || '.' || c.relname)::text collate "C"
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'profiles',
        'moments',
        'reflections',
        'goals',
        'habits',
        'habit_checkins',
        'ai_usage_events',
        'workspace_change_log'
      )
      and c.relrowsecurity
    order by c.relname
  $$,
  $$
    values
      ('public.ai_usage_events'::text collate "C"),
      ('public.goals'::text collate "C"),
      ('public.habit_checkins'::text collate "C"),
      ('public.habits'::text collate "C"),
      ('public.moments'::text collate "C"),
      ('public.profiles'::text collate "C"),
      ('public.reflections'::text collate "C"),
      ('public.workspace_change_log'::text collate "C")
  $$,
  'RLS is enabled on every user-owned table'
);

select results_eq(
  $$
    select distinct event_object_table::text collate "C"
    from information_schema.triggers
    where event_object_schema = 'public'
      and trigger_name = 'record_workspace_change'
    order by event_object_table
  $$,
  $$
    values
      ('goals'::text collate "C"),
      ('habit_checkins'::text collate "C"),
      ('habits'::text collate "C"),
      ('moments'::text collate "C"),
      ('profiles'::text collate "C"),
      ('reflections'::text collate "C")
  $$,
  'all synchronized resources emit durable change-log entries'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.workspace_change_log',
    'SELECT'
  )
    and not has_table_privilege(
      'authenticated',
      'public.workspace_change_log',
      'INSERT'
    )
    and not has_table_privilege(
      'authenticated',
      'public.workspace_change_log',
      'UPDATE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.workspace_change_log',
      'DELETE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.workspace_change_log',
      'TRUNCATE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.workspace_change_log',
      'REFERENCES'
    )
    and not has_table_privilege(
      'authenticated',
      'public.workspace_change_log',
      'TRIGGER'
    ),
  'authenticated clients have read-only change-log privileges'
);

select ok(
  not has_table_privilege('anon', 'public.workspace_change_log', 'SELECT')
    and not has_table_privilege(
      'anon',
      'public.workspace_change_log',
      'INSERT'
    )
    and not has_table_privilege(
      'anon',
      'public.workspace_change_log',
      'UPDATE'
    )
    and not has_table_privilege(
      'anon',
      'public.workspace_change_log',
      'DELETE'
    )
    and not has_table_privilege(
      'anon',
      'public.workspace_change_log',
      'TRUNCATE'
    )
    and not has_table_privilege(
      'anon',
      'public.workspace_change_log',
      'REFERENCES'
    )
    and not has_table_privilege(
      'anon',
      'public.workspace_change_log',
      'TRIGGER'
    ),
  'anonymous clients have no change-log privileges'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.handle_new_user()',
    'EXECUTE'
  )
    and not has_function_privilege(
      'authenticated',
      'public.handle_new_user()',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.resolve_habit_checkin_reference()',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.resolve_habit_checkin_reference()',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.advance_entity_version()',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.advance_entity_version()',
      'EXECUTE'
    ),
  'browser roles cannot directly execute trigger-only functions'
);

select ok(
  position(
    'pg_advisory_xact_lock' in pg_get_functiondef(
      'public.record_workspace_change()'::regprocedure
    )
  ) > 0,
  'change-log writers serialize per user before allocating a cursor'
);

select results_eq(
  $$
    select event_object_table::text collate "C"
    from information_schema.triggers
    where event_object_schema = 'public'
      and trigger_name like 'advance_%_version'
    order by event_object_table
  $$,
  $$
    values
      ('goals'::text collate "C"),
      ('habit_checkins'::text collate "C"),
      ('habits'::text collate "C"),
      ('moments'::text collate "C"),
      ('profiles'::text collate "C"),
      ('reflections'::text collate "C")
  $$,
  'all mutable entities install the version trigger'
);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'contract-user-1@example.com'),
  ('20000000-0000-0000-0000-000000000002', 'contract-user-2@example.com');

select is(
  (select count(*) from public.profiles)::bigint,
  2::bigint,
  'creating auth users atomically creates their profiles'
);

insert into public.moments (user_id, client_id, content, occurred_on)
values (
  '10000000-0000-0000-0000-000000000001',
  'cas-moment',
  'initial content',
  date '2025-01-01'
);

insert into public.habits (
  user_id,
  client_id,
  name,
  frequency,
  started_on
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'habit-explicit-start',
    'Explicit start',
    'daily',
    date '2024-02-03'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'habit-other-user',
    'Other user habit',
    'weekly',
    date '2024-02-04'
  );

insert into public.habits (user_id, client_id, name, frequency)
values (
  '10000000-0000-0000-0000-000000000001',
  'habit-default-start',
  'Default start',
  'daily'
);

select is(
  (
    select started_on
    from public.habits
    where client_id = 'habit-explicit-start'
  ),
  date '2024-02-03',
  'an offline client supplied started_on is preserved'
);

select is(
  (
    select started_on
    from public.habits
    where client_id = 'habit-default-start'
  ),
  current_date,
  'started_on still has a safe server default'
);

select results_eq(
  $$
    with changed as (
      update public.moments
      set content = 'first CAS winner'
      where user_id = '10000000-0000-0000-0000-000000000001'
        and client_id = 'cas-moment'
        and version = 1
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  $$ values (1::bigint) $$,
  'the first compare-and-swap update succeeds'
);

select is(
  (select version from public.moments where client_id = 'cas-moment'),
  2::bigint,
  'a successful update advances the entity version'
);

select results_eq(
  $$
    with changed as (
      update public.moments
      set content = 'stale overwrite'
      where user_id = '10000000-0000-0000-0000-000000000001'
        and client_id = 'cas-moment'
        and version = 1
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  $$ values (0::bigint) $$,
  'a stale compare-and-swap update affects no row'
);

update public.habits
set name = 'Renamed habit'
where client_id = 'habit-explicit-start';

select is(
  (
    select started_on
    from public.habits
    where client_id = 'habit-explicit-start'
  ),
  date '2024-02-03',
  'ordinary habit updates do not rewrite started_on'
);

insert into public.habit_checkins (
  user_id,
  client_id,
  habit_id,
  habit_client_id,
  checked_on
)
select
  user_id,
  'checkin-valid',
  id,
  client_id,
  date '2024-02-05'
from public.habits
where client_id = 'habit-explicit-start';

select ok(
  (
    select c.habit_id = h.id and c.habit_client_id = h.client_id
    from public.habit_checkins c
    join public.habits h on h.id = c.habit_id
    where c.client_id = 'checkin-valid'
  ),
  'a check-in resolves to the same-user habit identity'
);

select throws_ok(
  $$
    insert into public.habit_checkins (
      user_id,
      client_id,
      habit_id,
      habit_client_id,
      checked_on
    )
    select
      '10000000-0000-0000-0000-000000000001',
      'checkin-cross-user',
      id,
      client_id,
      date '2024-02-06'
    from public.habits
    where client_id = 'habit-other-user'
  $$,
  '23503',
  'Habit check-in must reference a habit owned by the same user',
  'a check-in cannot reference another user''s habit'
);

select is(
  (select count(*) from public.habit_checkins)::bigint,
  1::bigint,
  'the valid check-in exists before deleting its habit'
);

delete from public.habits where client_id = 'habit-explicit-start';

select is(
  (select count(*) from public.habit_checkins)::bigint,
  0::bigint,
  'deleting a habit cascades to its check-ins'
);

select results_eq(
  $$
    select operation collate "C", version
    from public.workspace_change_log
    where resource = 'habits'
      and client_id = 'habit-explicit-start'
    order by sequence desc
    limit 1
  $$,
  $$ values ('delete'::text collate "C", 2::bigint) $$,
  'physical deletion emits a versioned tombstone'
);

insert into auth.users (id, email)
values (
  '70000000-0000-0000-0000-000000000007',
  'cascade-delete@example.com'
);

insert into public.moments (user_id, client_id, content)
values (
  '70000000-0000-0000-0000-000000000007',
  'cascade-delete-moment',
  'Delete the account'
);

select lives_ok(
  $$
    delete from auth.users
    where id = '70000000-0000-0000-0000-000000000007'
  $$,
  'account deletion is not blocked by domain change-log triggers'
);

select is(
  (
    select count(*)
    from public.workspace_change_log
    where user_id = '70000000-0000-0000-0000-000000000007'
  )::bigint,
  0::bigint,
  'account deletion cascades all of the user''s change-log rows'
);

select * from finish();
rollback;
