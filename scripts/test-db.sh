#!/usr/bin/env bash
set -euo pipefail

# Contract tests are always local. Disable CLI telemetry/update noise and make
# sure a failed assertion cannot leave the Docker stack running.
export DO_NOT_TRACK=1
export SUPABASE_TELEMETRY_DISABLED=1

started_stack=0

cleanup() {
  if [[ "$started_stack" -ne 1 ]]; then
    return
  fi
  if ! supabase stop --no-backup >/dev/null 2>&1; then
    echo "warning: failed to stop the local Supabase stack" >&2
  fi
}
trap cleanup EXIT

if supabase status >/dev/null 2>&1; then
  echo "refusing to reset an already-running local Supabase stack" >&2
  exit 1
fi

supabase start
started_stack=1

test_change_log_commit_order() {
  docker exec supabase_db_bullet-ai psql \
    --username postgres --dbname postgres --set ON_ERROR_STOP=on \
    --command "insert into auth.users (id, email) values ('90000000-0000-0000-0000-000000000009', 'change-log-concurrency@example.com')" \
    >/dev/null

  docker exec supabase_db_bullet-ai psql \
    --username postgres --dbname postgres --set ON_ERROR_STOP=on \
    --command "begin; insert into public.moments (user_id, client_id, content) values ('90000000-0000-0000-0000-000000000009', 'concurrent-moment-a', 'first writer'); select pg_sleep(1); commit;" \
    >/dev/null &
  local writer_a=$!
  sleep 0.2

  docker exec supabase_db_bullet-ai psql \
    --username postgres --dbname postgres --set ON_ERROR_STOP=on \
    --command "insert into public.moments (user_id, client_id, content) values ('90000000-0000-0000-0000-000000000009', 'concurrent-moment-b', 'second writer')" \
    >/dev/null &
  local writer_b=$!
  sleep 0.2

  if ! kill -0 "$writer_b" 2>/dev/null; then
    echo "change-log concurrency contract failed: second writer did not wait" >&2
    wait "$writer_a"
    wait "$writer_b"
    return 1
  fi

  wait "$writer_a"
  wait "$writer_b"
  local ordered
  ordered="$(
    docker exec supabase_db_bullet-ai psql \
      --username postgres --dbname postgres --tuples-only --no-align \
      --command "select min(sequence) filter (where client_id = 'concurrent-moment-a') < min(sequence) filter (where client_id = 'concurrent-moment-b') from public.workspace_change_log where user_id = '90000000-0000-0000-0000-000000000009' and resource = 'moments'"
  )"
  if [[ "$ordered" != "t" ]]; then
    echo "change-log concurrency contract failed: cursor order was not serialized" >&2
    return 1
  fi
  docker exec supabase_db_bullet-ai psql \
    --username postgres --dbname postgres --set ON_ERROR_STOP=on \
    --command "delete from auth.users where id = '90000000-0000-0000-0000-000000000009'" \
    >/dev/null
  echo "change-log concurrency contract passed"
}

# Fresh-install contract: config.toml is checked against the manifest and
# seeds the maintained 000 + forward-migration chain.
supabase db reset --local
test_change_log_commit_order
supabase test db supabase/tests/database
