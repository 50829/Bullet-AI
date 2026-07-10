import type {
  DataResource,
  EntityByResource,
  MutationRecord,
  OverlayRecord,
  SnapshotRecord,
} from "./types";

const ACTIVE_STATUSES = new Set(["queued", "sending", "blocked", "conflict"]);
const STATUS_PRIORITY = {
  synced: 0,
  queued: 1,
  sending: 2,
  blocked: 3,
  conflict: 4,
} as const;

function compareMutations<R extends DataResource>(
  left: MutationRecord<R>,
  right: MutationRecord<R>,
) {
  return (
    left.createdAt.localeCompare(right.createdAt) ||
    left.mutationId.localeCompare(right.mutationId)
  );
}

export function applyPendingOverlay<R extends DataResource>(
  snapshots: SnapshotRecord<R>[],
  mutations: MutationRecord<R>[],
): OverlayRecord<R>[] {
  return applyMutationOverlay(
    snapshots.map((snapshot) => snapshot.entity),
    mutations,
  );
}

export function applyMutationOverlay<R extends DataResource>(
  baseEntities: EntityByResource[R][],
  mutations: MutationRecord<R>[],
): OverlayRecord<R>[] {
  const entities = new Map<string, EntityByResource[R]>();
  const syncByClientId = new Map<string, OverlayRecord<R>["sync"]>();

  baseEntities.forEach((entity) => {
    entities.set(entity.clientId, entity);
    syncByClientId.set(entity.clientId, {
      mutationId: null,
      status: "synced",
      error: null,
    });
  });

  const byClientId = new Map<string, MutationRecord<R>[]>();
  mutations
    .filter((mutation) => ACTIVE_STATUSES.has(mutation.status))
    .sort(compareMutations)
    .forEach((mutation) => {
      const group = byClientId.get(mutation.clientId) ?? [];
      group.push(mutation);
      byClientId.set(mutation.clientId, group);
    });

  byClientId.forEach((group, clientId) => {
    const latest = group.at(-1)!;
    const issue = group
      .filter(
        (mutation) =>
          mutation.status === "blocked" || mutation.status === "conflict",
      )
      .sort(
        (left, right) =>
          STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status] ||
          compareMutations(left, right),
      )
      .at(-1);

    if (latest.kind === "delete" && !issue) {
      entities.delete(clientId);
      return;
    }

    entities.set(clientId, latest.optimistic);
    const presentation = issue ?? latest;
    syncByClientId.set(clientId, {
      mutationId: presentation.mutationId,
      status: presentation.status,
      error: presentation.lastError ?? null,
    });
  });

  return [...entities.entries()].map(([clientId, entity]) => ({
    entity,
    sync: syncByClientId.get(clientId) ?? {
      mutationId: null,
      status: "synced",
      error: null,
    },
  }));
}
