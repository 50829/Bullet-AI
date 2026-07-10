import type {
  ConflictResolution,
  DataResource,
  DataStoreApi,
  DataSyncControl,
  EntityByResource,
} from "@/data";
import { loadRemoteEntitiesByClientId } from "@/data/supabase/change-reader";
import { logger } from "../../lib/observability/logger";

export type ConflictRemoteLoader = (
  userId: string,
  resource: DataResource,
  clientId: string,
) => Promise<EntityByResource[DataResource] | null>;

const loadLatestConflictRemote: ConflictRemoteLoader = async (
  userId,
  resource,
  clientId,
) => {
  const records = await loadRemoteEntitiesByClientId(userId, resource, [
    clientId,
  ]);
  return (records[0] as EntityByResource[DataResource] | undefined) ?? null;
};

export async function resolveWorkspaceConflict<R extends DataResource>(
  store: DataStoreApi,
  worker: DataSyncControl | null,
  id: string,
  resolution: ConflictResolution<R>,
  loadRemote: ConflictRemoteLoader = loadLatestConflictRemote,
) {
  const details = await store.getConflictDetails(id);
  if (!details) return null;
  const remoteOverride = await loadRemote(
    details.userId,
    details.resource,
    details.clientId,
  );
  const result = await store.resolveConflict(id, {
    ...resolution,
    remoteOverride,
  } as ConflictResolution<R>);
  if (result?.outcome === "requeued") {
    const flush = worker?.requestFlush();
    void flush?.catch((error) => {
      logger.warn("workspace_conflict_flush_failed", {
        userId: details.userId,
        resource: details.resource,
        mutationId: details.mutationId,
        error,
      });
    });
  }
  return result;
}
