"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type {
  DataResource,
  EntityByResource,
  MutationRecord,
  OverlayRecord,
} from "../../../lib/data-v2";
import type { MomentEntity, ReflectionEntity } from "../../../domain/entities";
import { useDataResource, useDataV2 } from "../../../lib/data-v2";
import { logger } from "../../../lib/observability/logger";
import {
  createHistoryPaginationController,
  historyOverlayKeyForEvent,
  mergeHistoryOverlay,
  mergeHistorySnapshot,
  readWithStableHistoryWatermark,
  workspaceHistoryOverlayQueryKey,
  workspaceHistoryQueryKey,
} from "./historyPagination";
import { loadRemoteChangeWatermark } from "./remoteChangeReaderV2";
import {
  loadRemoteResourcePage,
  type MomentPageCursor,
  type PaginatedResource,
  type ReflectionPageCursor,
} from "./remoteRepositoryV2";
import { synchronizeRemoteResource } from "./remoteSyncV2";

type WorkspaceHistoryCursor = MomentPageCursor | ReflectionPageCursor;
type WorkspaceHistoryEntity = MomentEntity | ReflectionEntity;
type WorkspaceHistoryPage = {
  items: WorkspaceHistoryEntity[];
  nextCursor: WorkspaceHistoryCursor | null;
  watermark: string;
};
type WorkspaceHistoryPageParam = {
  cursor: WorkspaceHistoryCursor | null;
  watermark: string | null;
};

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

function isPaginatedResource(
  resource: DataResource,
): resource is PaginatedResource {
  return resource === "moments" || resource === "reflections";
}

async function loadHistoryPage(
  userId: string,
  resource: DataResource,
  cursor: WorkspaceHistoryCursor | null,
): Promise<Omit<WorkspaceHistoryPage, "watermark">> {
  if (resource === "moments") {
    return loadRemoteResourcePage(userId, resource, {
      cursor: cursor as MomentPageCursor | null,
    });
  }
  if (resource === "reflections") {
    return loadRemoteResourcePage(userId, resource, {
      cursor: cursor as ReflectionPageCursor | null,
    });
  }
  throw new Error(`${resource} does not support history pagination`);
}

export function useWorkspaceResource<R extends DataResource>(
  userId: string | null,
  resource: R,
  options: { fullHistory?: boolean } = {},
) {
  const { notifier, store } = useDataV2();
  const queryClient = useQueryClient();
  const fullHistory = Boolean(options.fullHistory);
  const query = useDataResource(userId, resource, {
    remoteLoader: userId
      ? async () => {
          await synchronizeRemoteResource({ store, userId, resource });
          return { kind: "snapshots-managed" as const };
        }
      : undefined,
  });

  const historyOverlayQuery = useQuery<MutationRecord<R>[]>({
    queryKey: workspaceHistoryOverlayQueryKey(userId ?? "anonymous", resource),
    enabled: Boolean(userId && fullHistory),
    queryFn: async () => {
      const mutations = await store.listPendingMutations(userId!);
      return mutations.filter(
        (mutation) => mutation.resource === resource,
      ) as MutationRecord<R>[];
    },
  });

  useEffect(() => {
    if (!userId || !fullHistory) return;
    return notifier.subscribe((event) => {
      const overlayKey = historyOverlayKeyForEvent(event, userId, resource);
      if (overlayKey) {
        void queryClient.invalidateQueries({
          queryKey: overlayKey,
          exact: true,
        });
        void Promise.all([
          store.getSnapshot(userId, resource, event.clientId),
          store.listPendingMutations(userId),
        ])
          .then(([snapshot, pending]) => {
            const hasPendingEntityMutation = pending.some(
              (mutation) =>
                mutation.resource === resource &&
                mutation.clientId === event.clientId,
            );
            // No snapshot can mean either an unloaded old row or a completed
            // delete. Only remove a loaded row once no durable mutation still
            // owns its optimistic representation.
            if (!snapshot && hasPendingEntityMutation) return;
            queryClient.setQueryData<
              InfiniteData<WorkspaceHistoryPage, WorkspaceHistoryPageParam>
            >(workspaceHistoryQueryKey(userId, resource), (current) => {
              if (!current) return current;
              const pages = mergeHistorySnapshot<R>(
                current.pages.map((page) => ({
                  items: page.items as EntityByResource[R][],
                })),
                event.clientId,
                (snapshot?.entity as EntityByResource[R] | undefined) ?? null,
                {
                  insertIfMissing:
                    event.type === "snapshot-changed" &&
                    Boolean(event.mutationId),
                },
              );
              return {
                ...current,
                pages: current.pages.map((page, index) => ({
                  ...page,
                  items: pages[index].items as WorkspaceHistoryEntity[],
                })),
              };
            });
          })
          .catch((error) => {
            logger.warn("workspace_history_overlay_snapshot_failed", {
              userId,
              resource,
              clientId: event.clientId,
              error,
            });
          });
      }
    });
  }, [fullHistory, notifier, queryClient, resource, store, userId]);

  const historyQuery = useInfiniteQuery({
    queryKey: workspaceHistoryQueryKey(userId ?? "anonymous", resource),
    enabled: Boolean(userId && fullHistory && isPaginatedResource(resource)),
    initialPageParam: {
      cursor: null,
      watermark: null,
    } as WorkspaceHistoryPageParam,
    queryFn: async ({ pageParam }): Promise<WorkspaceHistoryPage> => {
      const activeUserId = userId!;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("完整历史需要联网读取");
      }
      try {
        const stable = await readWithStableHistoryWatermark({
          expectedWatermark: pageParam.watermark,
          readWatermark: () =>
            loadRemoteChangeWatermark(activeUserId, resource),
          readPage: () =>
            loadHistoryPage(activeUserId, resource, pageParam.cursor),
        });
        return { ...stable.page, watermark: stable.watermark };
      } catch (error) {
        logger.warn("workspace_history_page_read_failed", {
          userId: activeUserId,
          resource,
          error,
        });
        throw error;
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor
        ? {
            cursor: lastPage.nextCursor,
            watermark: lastPage.watermark,
          }
        : undefined,
  });

  const recentItems = useMemo(
    () => (query.data ?? []).map(withSyncState),
    [query.data],
  );
  const historyItems = useMemo(() => {
    if (!historyQuery.data) return undefined;
    return mergeHistoryOverlay<R>(
      historyQuery.data.pages.map((page) => ({
        items: page.items as EntityByResource[R][],
      })),
      historyOverlayQuery.data ?? [],
    ).map(withSyncState);
  }, [historyOverlayQuery.data, historyQuery.data]);
  const items = (fullHistory ? historyItems : undefined) ?? recentItems;
  const pagination = createHistoryPaginationController({
    enabled: fullHistory,
    hasNextPage: Boolean(historyQuery.hasNextPage),
    isFetchingNextPage: historyQuery.isFetchingNextPage,
    fetchNextPage: historyQuery.fetchNextPage,
  });

  return {
    ...query,
    items,
    loading:
      query.isLoading ||
      Boolean(
        fullHistory &&
        (historyQuery.isLoading || historyOverlayQuery.isLoading) &&
        recentItems.length === 0,
      ),
    error:
      query.error ??
      (fullHistory ? (historyQuery.error ?? historyOverlayQuery.error) : null),
    ...pagination,
    refresh: async () => {
      const result = await query.refetch();
      if (fullHistory) {
        await Promise.all([
          queryClient.resetQueries({
            queryKey: workspaceHistoryQueryKey(userId!, resource),
            exact: true,
          }),
          historyOverlayQuery.refetch(),
        ]);
      }
      return result;
    },
  };
}
