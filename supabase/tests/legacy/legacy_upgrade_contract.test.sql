begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

select is(
  (
    select username
    from public.profiles
    where user_id = '80000000-0000-0000-0000-000000000008'
  ),
  'Legacy User',
  'legacy profile text is normalized without losing the row'
);

select is(
  (
    select occurred_on
    from public.moments
    where user_id = '80000000-0000-0000-0000-000000000008'
  ),
  date '2024-02-03',
  'legacy moment dates become the stable occurred_on value'
);

select is(
  (
    select count(*)
    from public.moments
    where client_id = 'deleted-legacy-moment'
  )::bigint,
  0::bigint,
  'legacy soft-deleted moments are removed during convergence'
);

select results_eq(
  $$
    select title, body
    from public.reflections
    where user_id = '80000000-0000-0000-0000-000000000008'
  $$,
  $$ values ('Legacy title'::text, 'Legacy body'::text) $$,
  'legacy reflection content is split into the v2 fields'
);

select ok(
  (
    select completed_at is not null
    from public.goals
    where user_id = '80000000-0000-0000-0000-000000000008'
  ),
  'legacy completed goals receive a completed_at timestamp'
);

select results_eq(
  $$
    select frequency, started_on
    from public.habits
    where user_id = '80000000-0000-0000-0000-000000000008'
  $$,
  $$ values ('weekly'::text, date '2024-02-07') $$,
  'legacy habits preserve their business start date and normalize frequency'
);

select is(
  (
    select count(*)
    from public.habit_checkins
    where user_id = '80000000-0000-0000-0000-000000000008'
      and checked_on = date '2024-02-08'
  )::bigint,
  1::bigint,
  'legacy last_checkin data is retained as a v2 check-in row'
);

select is(
  (
    select count(*)
    from public.workspace_change_log
    where user_id = '80000000-0000-0000-0000-000000000008'
  )::bigint,
  0::bigint,
  '006 starts a clean incremental log after the legacy data converges'
);

select * from finish();
rollback;
