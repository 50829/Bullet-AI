import type { QueryClient } from "@tanstack/react-query";
import type { DataV2Event } from "../../../lib/data-v2/channel";
import { applyMutationOverlay } from "../../../lib/data-v2/overlay";
import type {
  DataResource,
  EntityByResource,
  MutationRecord,
} from "../../../lib/data-v2/types";

export function workspaceHistoryQueryKey(
  userId: string,
  resource: DataResource,
) {
  // This key intentionally does not share the data-v2 prefix. Data-v2
  // notifications refresh the local overlay, not every loaded remote page.
  return ["workspace-history", userId, resource] as const;
}

export function workspaceHistoryOverlayQueryKey(
  userId: string,
  resource: DataResource,
) {
  return ["workspace-history-overlay", userId, resource] as const;
}

export async function clearWorkspaceUserQueryCache(
  queryClient: QueryClient,
  userId: string,
) {
  const prefixes = [
    ["data-v2", userId],
    ["workspace-history", userId],
    ["workspace-history-overlay", userId],
  ] as const;
  await Promise.all(
    prefixes.map((queryKey) => queryClient.cancelQueries({ queryKey })),
  );
  prefixes.forEach((queryKey) => queryClient.removeQueries({ queryKey }));
}

export class WorkspaceHistoryChangedError extends Error {
  constructor() {
    super(
      "Workspace history changed while pages were loading; refresh required",
    );
    this.name = "WorkspaceHistoryChangedError";
  }
}

export async function readWithStableHistoryWatermark<T>({
  expectedWatermark,
  readWatermark,
  readPage,
}: {
  expectedWatermark: string | null;
  readWatermark: () => Promise<string>;
  readPage: () => Promise<T>;
}) {
  const before = await readWatermark();
  if (expectedWatermark !== null && before !== expectedWatermark) {
    throw new WorkspaceHistoryChangedError();
  }
  const page = await readPage();
  const after = await readWatermark();
  if (after !== before) throw new WorkspaceHistoryChangedError();
  return { page, watermark: expectedWatermark ?? before };
}

export function historyOverlayKeyForEvent(
  event: DataV2Event,
  userId: string,
  resource: DataResource,
) {
  return event.userId === userId && event.resource === resource
    ? workspaceHistoryOverlayQueryKey(userId, resource)
    : null;
}

export function mergeRemotePages<R extends DataResource>(
  pages: ReadonlyArray<{
    items: readonly EntityByResource[R][];
  }>,
) {
  const entities = new Map<string, EntityByResource[R]>();
  pages.forEach((page) => {
    page.items.forEach((entity) => {
      const current = entities.get(entity.clientId);
      if (!current || entity.version >= current.version) {
        entities.set(entity.clientId, entity);
      }
    });
  });
  return [...entities.values()];
}

export function mergeHistoryOverlay<R extends DataResource>(
  pages: ReadonlyArray<{
    items: readonly EntityByResource[R][];
  }>,
  mutations: MutationRecord<R>[],
) {
  return applyMutationOverlay(mergeRemotePages(pages), mutations);
}

export function mergeHistorySnapshot<R extends DataResource>(
  pages: ReadonlyArray<{
    items: readonly EntityByResource[R][];
  }>,
  clientId: string,
  entity: EntityByResource[R] | null,
  options: { insertIfMissing?: boolean } = {},
) {
  let found = false;
  const next = pages.map((page) => ({
    items: page.items.flatMap((item) => {
      if (item.clientId !== clientId) return [item];
      found = true;
      return entity ? [entity] : [];
    }),
  }));
  if (entity && !found && options.insertIfMissing === true && next[0]) {
    next[0] = { items: [entity, ...next[0].items] };
  }
  return next;
}

export function createHistoryPaginationController({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  enabled: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  const hasMore = enabled && hasNextPage;
  const loadingMore = enabled && isFetchingNextPage;
  return {
    hasMore,
    loadingMore,
    loadMore: async () => {
      if (!hasMore || loadingMore) return;
      await fetchNextPage();
    },
  };
}
