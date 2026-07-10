begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

select has_function(
  'public',
  'reserve_ai_usage_event',
  array[]::text[],
  'the fixed-argument AI quota RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.reserve_ai_usage_event()',
    'EXECUTE'
  ),
  'authenticated users may execute the AI quota RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.reserve_ai_usage_event()',
    'EXECUTE'
  ),
  'anonymous users may not execute the AI quota RPC'
);

select is(
  (select count(*) from storage.buckets where id = 'moments')::bigint,
  1::bigint,
  'the moments bucket exists'
);

select is(
  (select public from storage.buckets where id = 'moments'),
  false,
  'the moments bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'moments'),
  5242880::bigint,
  'the moments bucket has a 5 MiB limit'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'moments'),
  array['image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif']::text[],
  'the moments bucket only admits the supported image MIME types'
);

select results_eq(
  $$
    select policyname::text collate "C"
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'Users can % own moment images'
    order by policyname
  $$,
  $$
    values
      ('Users can delete own moment images'::text collate "C"),
      ('Users can read own moment images'::text collate "C"),
      ('Users can update own moment images'::text collate "C"),
      ('Users can upload own moment images'::text collate "C")
  $$,
  'all four private moments object policies exist'
);

insert into auth.users (id, email)
values
  ('50000000-0000-0000-0000-000000000005', 'service-user-1@example.com'),
  ('60000000-0000-0000-0000-000000000006', 'service-user-2@example.com');

insert into storage.buckets (id, name, public)
values ('contract-other-bucket', 'contract-other-bucket', false);

insert into storage.objects (bucket_id, name)
values (
  'moments',
  '60000000-0000-0000-0000-000000000006/other-user.jpg'
);

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-0000-0000-000000000005';
set local request.jwt.claim.role = 'authenticated';

select throws_ok(
  $$
    insert into public.ai_usage_events (user_id)
    values ('50000000-0000-0000-0000-000000000005')
  $$,
  '42501',
  'new row violates row-level security policy for table "ai_usage_events"',
  'authenticated clients cannot insert AI usage events directly'
);

select is(
  public.reserve_ai_usage_event(),
  true,
  'an authenticated user can reserve usage through the RPC'
);

select is(
  (select count(*) from public.ai_usage_events)::bigint,
  1::bigint,
  'the RPC creates one event visible to its owner'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'moments',
      '50000000-0000-0000-0000-000000000005/own-image.jpg'
    )
  $$,
  'a user may insert a moments object under their own folder'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'moments',
      '60000000-0000-0000-0000-000000000006/cross-user.jpg'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a user may not insert into another user''s folder'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'contract-other-bucket',
      '50000000-0000-0000-0000-000000000005/not-a-moment.jpg'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'browser writes are denied outside the moments bucket'
);

select is(
  (select count(*) from storage.objects)::bigint,
  1::bigint,
  'a user only sees objects in their own moments folder'
);

select throws_ok(
  $$
    delete from storage.objects
    where name = '60000000-0000-0000-0000-000000000006/other-user.jpg'
  $$,
  '42501',
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'direct SQL deletion cannot bypass the Storage API authorization boundary'
);

select * from finish();
rollback;
