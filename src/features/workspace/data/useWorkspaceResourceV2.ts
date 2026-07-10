"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type {
  DataResource,
  EntityByResource,
  MutationRecord,
  OverlayRecord,
} from "../../../lib/data-v2";
import type { MomentEntity, ReflectionEntity } from "../../../domain/entities";
import {
  dataV2QueryKey,
  applyMutationOverlay,
  useDataResource,
  useDataV2,
} from "../../../lib/data-v2";
import { logger } from "../../../lib/observability/logger";
import { loadRemoteResource } from "./remoteRepositoryV2";

function withSyncState<R extends DataResource>(record: OverlayRecord<R>) {
  const { entity, sync } = record;
  const syncMetadata =
    sync.status === "synced"
      ? undefined
      : {
          pending: sync.status === "queued" || sync.status === "sending",
          blocked: sync.status === "blocked",
          conflict: sync.status === "conflict",
        };
  return {
    ...entity,
    ...(syncMetadata ? { sync: syncMetadata } : {}),
  } as EntityByResource[R];
}

function recentSnapshotEntities<R extends DataResource>(
  resource: R,
  entities: EntityByResource[R][],
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  if (resource === "moments") {
    const dateKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    return entities.filter(
      (entity) => (entity as MomentEntity).occurredOn >= dateKey,
    );
  }
  if (resource === "reflections") {
    const timestamp = cutoff.toISOString();
    return entities.filter(
      (entity) => (entity as ReflectionEntity).updatedAt >= timestamp,
    );
  }
  return entities;
}

export function useWorkspaceResource<R extends DataResource>(
  userId: string | null,
  resource: R,
  options: { fullHistory?: boolean } = {},
) {
  const { notifier, store } = useDataV2();
  const queryClient = useQueryClient();
  const [historyRevision, setHistoryRevision] = useState(0);
  useEffect(() => {
    if (!userId || !options.fullHistory) return;
    return notifier.subscribe((event) => {
      if (event.userId === userId && event.resource === resource) {
        setHistoryRevision((revision) => revision + 1);
      }
    });
  }, [notifier, options.fullHistory, resource, userId]);
  const query = useDataResource(userId, resource, {
    remoteLoader:
      userId && !options.fullHistory
        ? () => loadRemoteResource(userId, resource)
        : undefined,
  });
  const historyQuery = useQuery({
    queryKey: [
      ...dataV2QueryKey(userId ?? "anonymous", resource),
      "full-history",
      historyRevision,
    ] as const,
    enabled: Boolean(userId && options.fullHistory),
    queryFn: async () => {
      const activeUserId = userId!;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("完整历史需要联网读取");
      }
      try {
        const sessionToken = store.getUserSessionToken(activeUserId);
        const readStartedAt = new Date().toISOString();
        const remote = await loadRemoteResource(activeUserId, resource, {
          fullHistory: true,
        });
        await store.replaceSnapshots(
          activeUserId,
          resource,
          recentSnapshotEntities(resource, remote),
          { notify: false, readStartedAt, sessionToken },
        );
        queryClient.setQueryData(
          dataV2QueryKey(activeUserId, resource),
          await store.readOverlayCollection(activeUserId, resource),
        );
        const mutations = (
          await store.listPendingMutations(activeUserId)
        ).filter(
          (mutation) => mutation.resource === resource,
        ) as MutationRecord<R>[];
        return applyMutationOverlay(remote, mutations).map(withSyncState);
      } catch (error) {
        logger.warn("workspace_history_read_fell_back_to_snapshot", {
          userId: activeUserId,
          resource,
          error,
        });
        throw error;
      }
    },
  });

  const recentItems = useMemo(
    () => (query.data ?? []).map(withSyncState),
    [query.data],
  );
  const items =
    (options.fullHistory ? historyQuery.data : undefined) ?? recentItems;

  return {
    ...query,
    items,
    loading:
      query.isLoading ||
      Boolean(
        options.fullHistory &&
        historyQuery.isLoading &&
        recentItems.length === 0,
      ),
    error: query.error ?? (options.fullHistory ? historyQuery.error : null),
    refresh: async () => {
      const result = await query.refetch();
      if (options.fullHistory) await historyQuery.refetch();
      return result;
    },
  };
}
