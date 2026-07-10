-- Make a Habit's business start date explicit and immutable.
--
-- This migration intentionally does not infer historical values. Run the
-- read-only audit and, when its evidence is accepted, the separate repair
-- operation before applying this invariant.

begin;

alter table public.habits
  alter column started_on drop default;

create or replace function public.enforce_habit_started_on_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.started_on is distinct from old.started_on then
    raise check_violation using
      message = 'Habit started_on is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_habit_started_on_immutable()
  from public, anon, authenticated;

drop trigger if exists enforce_habit_started_on_immutable on public.habits;
create trigger enforce_habit_started_on_immutable
  before update of started_on on public.habits
  for each row execute function public.enforce_habit_started_on_immutable();

commit;

notify pgrst, 'reload schema';
