import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { MomentEntity } from "../../domain/entities";
import type { MutationRecord } from "../local/types";
import {
  createHistoryPaginationController,
  clearWorkspaceUserQueryCache,
  historyOverlayKeyForEvent,
  mergeHistoryOverlay,
  mergeRemotePages,
  mergeHistorySnapshot,
  readWithStableHistoryWatermark,
  workspaceHistoryOverlayQueryKey,
  workspaceHistoryQueryKey,
} from "./history-pagination";

function moment(
  clientId: string,
  version: number,
  content = clientId,
): MomentEntity {
  return {
    clientId,
    userId: "user-1",
    version,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: `2026-07-10T00:0${version}:00.000Z`,
    content,
    occurredOn: "2026-07-10",
    imagePath: null,
  };
}

function mutation(
  overrides: Partial<MutationRecord<"moments">> &
    Pick<MutationRecord<"moments">, "clientId" | "kind" | "optimistic">,
): MutationRecord<"moments"> {
  const common = {
    mutationId: `mutation-${overrides.clientId}`,
    userId: "user-1",
    resource: "moments" as const,
    clientId: overrides.clientId,
    optimistic: overrides.optimistic,
    status: "queued" as const,
    attemptCount: 0,
    nextAttemptAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
  };
  if (overrides.kind === "create") {
    return {
      ...common,
      ...overrides,
      kind: "create",
      baseVersion: null,
      changes: {
        content: overrides.optimistic.content,
        occurredOn: overrides.optimistic.occurredOn,
        imagePath: overrides.optimistic.imagePath,
      },
    } as MutationRecord<"moments">;
  }
  if (overrides.kind === "delete") {
    return {
      ...common,
      ...overrides,
      kind: "delete",
      baseVersion: overrides.optimistic.version,
      changes: null,
    } as MutationRecord<"moments">;
  }
  return {
    ...common,
    ...overrides,
    kind: "patch",
    baseVersion: overrides.optimistic.version,
    changes: { content: overrides.optimistic.content },
  } as MutationRecord<"moments">;
}

describe("workspace history pagination", () => {
  it("merges fetched pages by client id and retains the newest duplicate", () => {
    const merged = mergeRemotePages<"moments">([
      { items: [moment("moment-1", 1), moment("moment-2", 1)] },
      {
        items: [moment("moment-2", 2, "newer"), moment("moment-3", 1)],
      },
    ]);

    expect(merged.map((item) => item.clientId)).toEqual([
      "moment-1",
      "moment-2",
      "moment-3",
    ]);
    expect(merged.find((item) => item.clientId === "moment-2")).toMatchObject({
      version: 2,
      content: "newer",
    });
  });

  it("applies pending and conflict overlays to only the remote pages loaded so far", () => {
    const conflict = mutation({
      clientId: "moment-1",
      kind: "patch",
      optimistic: moment("moment-1", 1, "local draft"),
      status: "conflict",
      lastError: "stale version",
    });
    const pendingCreate = mutation({
      clientId: "moment-local",
      kind: "create",
      optimistic: moment("moment-local", 0, "offline"),
    });

    const records = mergeHistoryOverlay<"moments">(
      [{ items: [moment("moment-1", 2, "remote")] }],
      [conflict, pendingCreate],
    );

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      entity: { clientId: "moment-1", content: "local draft" },
      sync: { status: "conflict" },
    });
    expect(records[1]).toMatchObject({
      entity: { clientId: "moment-local", content: "offline" },
      sync: { status: "queued" },
    });
  });

  it("updates loaded pages from local snapshot events without a remote refetch", () => {
    const pages = [
      { items: [moment("moment-1", 1), moment("moment-2", 1)] },
      { items: [moment("moment-3", 1)] },
    ];
    const updated = mergeHistorySnapshot<"moments">(
      pages,
      "moment-2",
      moment("moment-2", 2, "synced update"),
    );
    expect(updated[0].items[1]).toMatchObject({
      version: 2,
      content: "synced update",
    });

    const deleted = mergeHistorySnapshot<"moments">(updated, "moment-3", null);
    expect(deleted.flatMap((page) => page.items)).toHaveLength(2);

    const created = mergeHistorySnapshot<"moments">(
      deleted,
      "moment-new",
      moment("moment-new", 1),
      { insertIfMissing: true },
    );
    expect(created[0].items[0].clientId).toBe("moment-new");

    const unknown = mergeHistorySnapshot<"moments">(
      pages,
      "moment-unknown",
      moment("moment-unknown", 1),
      { insertIfMissing: false },
    );
    expect(unknown.flatMap((page) => page.items)).toHaveLength(3);
  });

  it("clears base and history query families for only the signed-out user", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["data-v2", "user-1", "moments"], ["base"]);
    queryClient.setQueryData(workspaceHistoryQueryKey("user-1", "moments"), [
      "history",
    ]);
    queryClient.setQueryData(
      workspaceHistoryOverlayQueryKey("user-1", "moments"),
      ["overlay"],
    );
    queryClient.setQueryData(workspaceHistoryQueryKey("user-2", "moments"), [
      "other-user",
    ]);

    await clearWorkspaceUserQueryCache(queryClient, "user-1");

    expect(
      queryClient.getQueryData(["data-v2", "user-1", "moments"]),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(workspaceHistoryQueryKey("user-1", "moments")),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(
        workspaceHistoryOverlayQueryKey("user-1", "moments"),
      ),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(workspaceHistoryQueryKey("user-2", "moments")),
    ).toEqual(["other-user"]);
  });

  it("rejects a page when its fixed remote watermark changes", async () => {
    const readPage = vi.fn(async () => ({ items: ["page"] }));
    const stableWatermark = vi.fn().mockResolvedValue("10");

    await expect(
      readWithStableHistoryWatermark({
        expectedWatermark: null,
        readWatermark: stableWatermark,
        readPage,
      }),
    ).resolves.toEqual({
      page: { items: ["page"] },
      watermark: "10",
    });

    const changedBeforeRead = vi.fn().mockResolvedValue("11");
    await expect(
      readWithStableHistoryWatermark({
        expectedWatermark: "10",
        readWatermark: changedBeforeRead,
        readPage,
      }),
    ).rejects.toThrow("refresh required");

    const changedDuringRead = vi
      .fn()
      .mockResolvedValueOnce("10")
      .mockResolvedValueOnce("11");
    await expect(
      readWithStableHistoryWatermark({
        expectedWatermark: "10",
        readWatermark: changedDuringRead,
        readPage,
      }),
    ).rejects.toThrow("refresh required");
  });

  it("routes matching notifications to the overlay without invalidating history pages", () => {
    const event = {
      type: "mutation-changed" as const,
      userId: "user-1",
      resource: "moments" as const,
      clientId: "moment-1",
    };

    expect(historyOverlayKeyForEvent(event, "user-1", "moments")).toEqual(
      workspaceHistoryOverlayQueryKey("user-1", "moments"),
    );
    expect(
      historyOverlayKeyForEvent(event, "other-user", "moments"),
    ).toBeNull();
    expect(workspaceHistoryQueryKey("user-1", "moments")[0]).not.toBe(
      "data-v2",
    );
    expect(workspaceHistoryOverlayQueryKey("user-1", "moments")).not.toEqual(
      workspaceHistoryQueryKey("user-1", "moments"),
    );
  });

  it("loads one next page only when the controller has another idle page", async () => {
    const fetchNextPage = vi.fn().mockResolvedValue(undefined);
    const ready = createHistoryPaginationController({
      enabled: true,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    await ready.loadMore();
    expect(ready).toMatchObject({ hasMore: true, loadingMore: false });
    expect(fetchNextPage).toHaveBeenCalledOnce();

    await createHistoryPaginationController({
      enabled: true,
      hasNextPage: true,
      isFetchingNextPage: true,
      fetchNextPage,
    }).loadMore();
    await createHistoryPaginationController({
      enabled: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage,
    }).loadMore();
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });
});
