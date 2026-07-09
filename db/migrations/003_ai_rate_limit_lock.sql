-- Re-apply the AI usage reservation RPC with per-user serialization.
-- Existing projects that already ran 002 need this incremental migration
-- because edited historical migrations are not replayed automatically.

create or replace function public.reserve_ai_usage_event(
  p_user_id uuid,
  p_window_start timestamptz,
  p_limit int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  event_count int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return false;
  end if;

  if p_limit <= 0 then
    return false;
  end if;

  -- Serialize per-user reservations so concurrent requests cannot all pass
  -- the count check before any insert commits.
  perform pg_advisory_xact_lock(
    hashtextextended('ai_usage_events:' || p_user_id::text, 0)
  );

  select count(*) into event_count
  from public.ai_usage_events
  where user_id = p_user_id
    and created_at >= p_window_start;

  if event_count >= p_limit then
    return false;
  end if;

  insert into public.ai_usage_events (user_id)
  values (p_user_id);

  return true;
end;
$$;

grant execute on function public.reserve_ai_usage_event(uuid, timestamptz, int)
  to authenticated;

notify pgrst, 'reload schema';
