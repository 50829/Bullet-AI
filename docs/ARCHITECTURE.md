# Current Architecture

This document describes the current code. Historical course reports and dated review notes are not implementation contracts.

## Product Boundary

Bullet-AI is a Today-centered personal workspace. The maintained domains are profile preferences, moments, reflections, goals, habits, and habit check-ins. AI has one purpose: strict goal planning. It does not chat over personal records and it never writes domain data directly.

## Ownership

- `src/domain`: explicit camelCase entities and stable identity helpers.
- `src/features/<domain>`: domain reads, writes, projections, and reusable domain UI.
- `src/features/today`: Today-only aggregation across goals, habits, moments, and reflections.
- `src/features/workspace`: route-scoped data providers, Supabase mapping, export, and sync diagnostics.
- `src/lib/data-v2`: IndexedDB lifecycle, snapshot repository, mutation state machine, pending overlay, query provider, and sync worker.
- `src/lib/profile`, `src/lib/auth`, `src/lib/supabase`: cross-feature infrastructure.
- `src/app`: routes, shell, and page-only interaction state.
- `src/shared`: UI and i18n primitives with no product-domain dependency.

Dependencies flow from `app -> features -> shared/lib`. `src/lib` and `src/shared` must not import `features` or `app`; ESLint enforces this.

## Read Path

1. `AuthSessionProvider` owns the browser Supabase session.
2. A route-scoped feature hook requests its resource through `useWorkspaceResource`.
3. IndexedDB snapshots and pending mutations produce the first render without waiting for the network.
4. A resource without a durable cursor performs one baseline read after first capturing its change-log high-water sequence.
5. Later refreshes pull `workspace_change_log` pages after that cursor, fetch only changed current rows, and atomically apply upserts, physical deletes, and the new cursor.
6. Version- and start-time-aware replacement rejects stale reads that would overwrite a newer synced snapshot.
7. TanStack Query caches the overlay and BroadcastChannel invalidates it across tabs.

An empty collection has its own durable sync marker; absence of rows is not confused with a resource that has never loaded. Each authenticated browser runtime also has a local generation token, so callbacks started before logout cannot write into a later login for the same user. Durable mutations are scoped only by `userId`, never by that in-memory token, so a refresh or another tab can take over the queue.

Moments and reflections keep a 90-day durable recent set. Their dedicated pages use stable keyset cursors and load full history one page at a time, retaining loaded old pages only in memory. Goals and check-ins keep complete local projections because retention settings and streak calculations require them, while remote refreshes are incremental after the baseline.

## Write Path

1. A feature hook creates the complete optimistic entity.
2. `DataV2Store.enqueueMutation` atomically writes the mutation and optional Blob.
3. Same-entity never-sent mutations compact (`create+patch`, `patch+patch`, `patch+delete`); `create+delete` cancels locally.
4. A check-in created for an offline-new Habit depends on the Habit create mutation; runnable selection and atomic claim both enforce that dependency.
5. `DataSyncWorker` runs only while online and visible, under a per-user Web Lock.
6. The Supabase executor performs idempotent create or version-CAS patch/delete.
7. Applied writes replace the snapshot only when they are not older than the current cross-tab snapshot. A queued successor rebases on the freshest version.
8. Version mismatch stores both the local draft and remote entity as a visible conflict.
9. Settings shows a field-level comparison. The user may accept remote, rebase and retry local, or submit merged business fields; remote deletion converts a retained local draft into an idempotent create.

Transient errors use unbounded exponential backoff with jitter. Auth failures pause until the auth revision changes. Permanent failures remain local and visible until the user discards them.

## Data Invariants

- `clientId` is the stable cross-device identity; database `id` never enters feature code.
- Every remotely mutable entity has a monotonically increasing `version`.
- Supabase is the canonical fact source; IndexedDB durably holds pending writes but may be cleared on logout.
- Domain code is camelCase. Snake_case exists only in the Supabase adapter and SQL.
- Deletion is physical. The 5-second undo window happens before enqueueing delete.
- A weekly habit has at most one check-in per configured week; `checkedOn` preserves the actual chosen day.
- A Habit's immutable `startedOn` is business data; `createdAt` is only a technical audit timestamp.
- Reflections contain only `title` and `body`.
- Moment images use the private `moments` bucket and mutation-specific object paths.
- Moment entities persist only `imagePath`; signed URLs and local Blob URLs exist only in the in-memory view layer.
- AI rate reservation is a fixed, no-argument database RPC; callers cannot choose the quota window or limit.

## Operational Rules

- Fresh databases use `000_current_schema.sql` followed by every forward migration starting at `006`.
- Existing legacy databases require backup, preflight, `005_domain_schema_v2.sql`, then the same `006+` forward chain.
- `db/migration-manifest.json` records both entry paths and immutable checksums; `pnpm migration:check` rejects rewritten or unlisted SQL.
- CI runs type, lint, formatting, migration, unit, build, and isolated local Supabase/pgTAP contracts. The local database script disables telemetry and always stops its Docker stack.
- API responses carry a request ID and `Server-Timing`; structured logs retain sanitized stack/cause data, and `/api/health` exposes configuration readiness without secret values.
- Moment image replace, clear, duplicate-create, and hard-delete paths retry mutation-specific Storage cleanup before the mutation completes. The manual audit script handles legacy or otherwise orphaned objects; there is no service-role cleanup route or scheduled cron.
- Full export requires network access so it cannot silently label a partial local cache as a complete backup.
