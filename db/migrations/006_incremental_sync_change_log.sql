-- Durable pull cursor for incremental workspace synchronization.
--
-- Apply after either the fresh schema (000_current_schema.sql) or the legacy
-- convergence migration (005_domain_schema_v2.sql). Physical deletes are
-- represented explicitly so a client never has to infer deletion from an
-- incomplete page of current rows.

begin;

create table if not exists public.workspace_change_log (
  sequence bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null check (
    resource in (
      'profiles',
      'moments',
      'reflections',
      'goals',
      'habits',
      'habit_checkins'
    )
  ),
  client_id text not null check (btrim(client_id) <> ''),
  operation text not null check (operation in ('upsert', 'delete')),
  version bigint not null check (version >= 1),
  changed_at timestamptz not null default now()
);

create index if not exists workspace_change_log_pull_idx
  on public.workspace_change_log(user_id, resource, sequence);

alter table public.workspace_change_log enable row level security;

drop policy if exists "Users can pull own workspace changes"
  on public.workspace_change_log;
create policy "Users can pull own workspace changes"
  on public.workspace_change_log for select
  using ((select auth.uid()) = user_id);

revoke all on public.workspace_change_log from anon, authenticated;
grant select on public.workspace_change_log to authenticated;

-- Security convergence must be forward-applied. Editing 000 or 005 would not
-- repair projects that already executed those entry migrations.
revoke all on function public.handle_new_user()
  from public, anon, authenticated;
revoke all on function public.resolve_habit_checkin_reference()
  from public, anon, authenticated;
revoke all on function public.advance_entity_version()
  from public, anon, authenticated;
revoke all on function public.reserve_ai_usage_event()
  from public, anon;
grant execute on function public.reserve_ai_usage_event() to authenticated;

create or replace function public.record_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case
    when tg_op = 'DELETE' then to_jsonb(old)
    else to_jsonb(new)
  end;
  owner_id uuid := (row_data ->> 'user_id')::uuid;
  stable_client_id text;
  entity_version bigint := (row_data ->> 'version')::bigint;
begin
  stable_client_id := case
    when tg_table_name = 'profiles' then owner_id::text
    else row_data ->> 'client_id'
  end;

  -- A user deletion cascades through every domain table and then removes the
  -- user's existing log. Do not create a new child row for an owner that is
  -- already being deleted.
  if not exists (
    select 1 from auth.users where id = owner_id
  ) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Identity values are allocated before commit, so they are not a safe pull
  -- cursor by themselves. Serializing writers per user ensures a later
  -- visible sequence can never overtake an earlier uncommitted change for the
  -- same user's resource cursors.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'workspace_change_log:' || owner_id::text,
      0
    )
  );

  insert into public.workspace_change_log (
    user_id,
    resource,
    client_id,
    operation,
    version
  ) values (
    owner_id,
    tg_table_name,
    stable_client_id,
    case when tg_op = 'DELETE' then 'delete' else 'upsert' end,
    entity_version
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.record_workspace_change()
  from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'moments',
    'reflections',
    'goals',
    'habits',
    'habit_checkins'
  ]
  loop
    execute format(
      'drop trigger if exists record_workspace_change on public.%I',
      table_name
    );
    execute format(
      'create trigger record_workspace_change '
      'after insert or update or delete on public.%I '
      'for each row execute function public.record_workspace_change()',
      table_name
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
