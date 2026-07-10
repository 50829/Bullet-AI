begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

insert into auth.users (id, email)
values
  ('30000000-0000-0000-0000-000000000003', 'rls-user-1@example.com'),
  ('40000000-0000-0000-0000-000000000004', 'rls-user-2@example.com');

insert into public.moments (user_id, client_id, content)
values
  ('30000000-0000-0000-0000-000000000003', 'moment-user-1', 'User 1'),
  ('40000000-0000-0000-0000-000000000004', 'moment-user-2', 'User 2');

insert into public.reflections (user_id, client_id, title, body)
values
  ('30000000-0000-0000-0000-000000000003', 'reflection-user-1', 'User 1', 'Body'),
  ('40000000-0000-0000-0000-000000000004', 'reflection-user-2', 'User 2', 'Body');

insert into public.goals (user_id, client_id, title)
values
  ('30000000-0000-0000-0000-000000000003', 'goal-user-1', 'User 1'),
  ('40000000-0000-0000-0000-000000000004', 'goal-user-2', 'User 2');

insert into public.habits (user_id, client_id, name)
values
  ('30000000-0000-0000-0000-000000000003', 'habit-user-1', 'User 1'),
  ('40000000-0000-0000-0000-000000000004', 'habit-user-2', 'User 2');

insert into public.habit_checkins (
  user_id,
  client_id,
  habit_id,
  habit_client_id,
  checked_on
)
select user_id, 'checkin-user-1', id, client_id, date '2025-01-01'
from public.habits
where client_id = 'habit-user-1';

insert into public.habit_checkins (
  user_id,
  client_id,
  habit_id,
  habit_client_id,
  checked_on
)
select user_id, 'checkin-user-2', id, client_id, date '2025-01-01'
from public.habits
where client_id = 'habit-user-2';

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000003';
set local request.jwt.claim.role = 'authenticated';

select is(
  auth.uid(),
  '30000000-0000-0000-0000-000000000003'::uuid,
  'the test session is authenticated as user 1'
);

select is((select count(*) from public.profiles)::bigint, 1::bigint, 'profiles only exposes the owner row');
select is((select count(*) from public.moments)::bigint, 1::bigint, 'moments only exposes owner rows');
select is((select count(*) from public.reflections)::bigint, 1::bigint, 'reflections only exposes owner rows');
select is((select count(*) from public.goals)::bigint, 1::bigint, 'goals only exposes owner rows');
select is((select count(*) from public.habits)::bigint, 1::bigint, 'habits only exposes owner rows');
select is((select count(*) from public.habit_checkins)::bigint, 1::bigint, 'check-ins only expose owner rows');
select is((select count(*) from public.workspace_change_log)::bigint, 6::bigint, 'the incremental log only exposes owner changes');

select throws_ok(
  $$
    insert into public.workspace_change_log (
      user_id,
      resource,
      client_id,
      operation,
      version
    ) values (
      '30000000-0000-0000-0000-000000000003',
      'moments',
      'forged-change',
      'upsert',
      1
    )
  $$,
  '42501',
  'permission denied for table workspace_change_log',
  'clients cannot forge change-log entries'
);

select lives_ok(
  $$
    insert into public.moments (user_id, client_id, content)
    values (
      '30000000-0000-0000-0000-000000000003',
      'moment-user-1-new',
      'Allowed'
    )
  $$,
  'a user can insert an owned entity'
);

select throws_ok(
  $$
    insert into public.moments (user_id, client_id, content)
    values (
      '40000000-0000-0000-0000-000000000004',
      'moment-cross-user',
      'Denied'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "moments"',
  'a user cannot insert an entity for another user'
);

select results_eq(
  $$
    with changed as (
      update public.moments
      set content = 'Owned update'
      where client_id = 'moment-user-1'
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  $$ values (1::bigint) $$,
  'a user can update an owned entity'
);

select results_eq(
  $$
    with changed as (
      update public.moments
      set content = 'Cross-user update'
      where client_id = 'moment-user-2'
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  $$ values (0::bigint) $$,
  'a cross-user update affects no row'
);

select results_eq(
  $$
    with removed as (
      delete from public.moments
      where client_id = 'moment-user-2'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  $$ values (0::bigint) $$,
  'a cross-user delete affects no row'
);

select results_eq(
  $$
    with removed as (
      delete from public.moments
      where client_id = 'moment-user-1-new'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  $$ values (1::bigint) $$,
  'a user can delete an owned entity'
);

select * from finish();
rollback;
