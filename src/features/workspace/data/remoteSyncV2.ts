import type { DataResource } from "../../../domain/entities";
import type { DataV2StoreApi } from "../../../lib/data-v2";
import { logger } from "../../../lib/observability/logger";
import {
  loadRemoteChangePage,
  loadRemoteChangeWatermark,
  loadRemoteEntitiesByClientId,
  type RemoteChange,
} from "./remoteChangeReaderV2";
import { loadRemoteResource } from "./remoteResourceReaderV2";

export function summarizeRemoteChangePage(changes: RemoteChange[]) {
  const byClientId = new Map<
    string,
    { lastOperation: RemoteChange["operation"]; resetIncarnation: boolean }
  >();
  changes.forEach((change) => {
    const current = byClientId.get(change.clientId);
    byClientId.set(change.clientId, {
      lastOperation: change.operation,
      resetIncarnation:
        current?.resetIncarnation === true ||
        (current?.lastOperation === "delete" && change.operation === "upsert"),
    });
  });
  const upsertClientIds: string[] = [];
  const deletedClientIds: string[] = [];
  const resetClientIds: string[] = [];
  byClientId.forEach((change, clientId) => {
    if (change.lastOperation === "delete") {
      deletedClientIds.push(clientId);
      return;
    }
    upsertClientIds.push(clientId);
    if (change.resetIncarnation) resetClientIds.push(clientId);
  });
  return { upsertClientIds, deletedClientIds, resetClientIds };
}

export async function synchronizeRemoteResource<R extends DataResource>({
  store,
  userId,
  resource,
}: {
  store: DataV2StoreApi;
  userId: string;
  resource: R;
}) {
  const sessionToken = store.getUserSessionToken(userId);
  const existingCursor = await store.getRemoteCursor(userId, resource);
  const startedAt = performance.now();

  if (existingCursor === null) {
    // Capture the high-water mark before the baseline. Any write committed
    // after this point has a larger sequence and is replayed on the next pull;
    // seeing it in both the baseline and delta is harmless because cursor
    // ordering and incarnation resets make the replay idempotent.
    const remoteCursor = await loadRemoteChangeWatermark(userId, resource);
    const entities = await loadRemoteResource(userId, resource);
    await store.replaceSnapshots(userId, resource, entities, {
      sessionToken,
      remoteCursor,
    });
    logger.info("data_v2_remote_baseline_applied", {
      userId,
      resource,
      entityCount: entities.length,
      remoteCursor,
      durationMs: performance.now() - startedAt,
    });
    return;
  }

  let cursor = existingCursor;
  let changeCount = 0;
  let upsertCount = 0;
  let deleteCount = 0;
  while (true) {
    const page = await loadRemoteChangePage(userId, resource, cursor);
    if (page.changes.length === 0) break;

    const planned = summarizeRemoteChangePage(page.changes);
    const current = await loadRemoteEntitiesByClientId(
      userId,
      resource,
      planned.upsertClientIds,
    );
    const currentIds = new Set(current.map((entity) => entity.clientId));
    const missingUpserts = planned.upsertClientIds.filter(
      (clientId) => !currentIds.has(clientId),
    );
    await store.applyRemoteDelta(userId, resource, {
      upserts: current,
      deletedClientIds: [...planned.deletedClientIds, ...missingUpserts],
      resetClientIds: planned.resetClientIds.filter((clientId) =>
        currentIds.has(clientId),
      ),
      remoteCursor: page.nextCursor,
      sessionToken,
    });

    changeCount += page.changes.length;
    upsertCount += current.length;
    deleteCount += planned.deletedClientIds.length + missingUpserts.length;
    if (page.nextCursor === cursor) {
      throw new Error("Remote change cursor did not advance");
    }
    cursor = page.nextCursor;
    if (!page.hasMore) break;
  }

  logger.info("data_v2_remote_delta_applied", {
    userId,
    resource,
    fromCursor: existingCursor,
    toCursor: cursor,
    changeCount,
    upsertCount,
    deleteCount,
    durationMs: performance.now() - startedAt,
  });
}
