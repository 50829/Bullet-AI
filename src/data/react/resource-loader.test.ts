import { describe, expect, it, vi } from "vitest";
import type { MomentEntity } from "../../domain/entities";
import type { DataStoreApi, OverlayRecord } from "../local";
import { loadLocalFirstResource } from "./resource-loader";

const localMoment: MomentEntity = {
  userId: "user-1",
  clientId: "moment-1",
  version: 1,
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
  content: "local",
  occurredOn: "2026-07-10",
  imagePath: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function storeMock(local: MomentEntity[] = [], hasLoadedCollection = false) {
  const overlay = local.map((entity) => ({
    entity,
    sync: { mutationId: null, status: "synced", error: null },
  })) satisfies OverlayRecord<"moments">[];
  return {
    getUserSessionToken: vi.fn(() => 1),
    hasLoadedCollection: vi.fn().mockResolvedValue(hasLoadedCollection),
    readOverlayCollection: vi.fn().mockResolvedValue(overlay),
    readCollection: vi.fn().mockResolvedValue(local),
    replaceSnapshots: vi.fn().mockResolvedValue(undefined),
  } as unknown as DataStoreApi;
}

describe("loadLocalFirstResource", () => {
  it("returns durable local state without waiting for a slow remote read", async () => {
    const remote = deferred<MomentEntity[]>();
    const store = storeMock([localMoment]);
    const onBackgroundRefresh = vi.fn();

    await expect(
      loadLocalFirstResource({
        store,
        userId: "user-1",
        resource: "moments",
        online: true,
        remoteLoader: () => remote.promise,
        onBackgroundRefresh,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        entity: expect.objectContaining({ content: "local" }),
      }),
    ]);
    expect(store.replaceSnapshots).not.toHaveBeenCalled();

    remote.resolve([{ ...localMoment, version: 2, content: "remote" }]);
    await vi.waitFor(() =>
      expect(store.replaceSnapshots).toHaveBeenCalledOnce(),
    );
    expect(onBackgroundRefresh).toHaveBeenCalledOnce();
  });

  it("waits for remote data only when no local state has ever been loaded", async () => {
    const store = storeMock();
    const remote = vi.fn().mockResolvedValue([localMoment]);

    await loadLocalFirstResource({
      store,
      userId: "user-1",
      resource: "moments",
      online: true,
      remoteLoader: remote,
      onBackgroundRefresh: vi.fn(),
    });

    expect(remote).toHaveBeenCalledOnce();
    expect(store.replaceSnapshots).toHaveBeenCalledOnce();
  });

  it("does not rewrite snapshots after an incremental loader commits them atomically", async () => {
    const store = storeMock([localMoment]);

    await loadLocalFirstResource({
      store,
      userId: "user-1",
      resource: "moments",
      online: true,
      remoteLoader: async () => ({ kind: "snapshots-managed" }),
      onBackgroundRefresh: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(store.readOverlayCollection).toHaveBeenCalledTimes(2),
    );
    expect(store.replaceSnapshots).not.toHaveBeenCalled();
  });

  it("does not wait for the network when a durable collection is known to be empty", async () => {
    const remote = deferred<MomentEntity[]>();
    const store = storeMock([], true);

    await expect(
      loadLocalFirstResource({
        store,
        userId: "user-1",
        resource: "moments",
        online: true,
        remoteLoader: () => remote.promise,
        onBackgroundRefresh: vi.fn(),
      }),
    ).resolves.toEqual([]);

    remote.resolve([]);
    await vi.waitFor(() =>
      expect(store.replaceSnapshots).toHaveBeenCalledOnce(),
    );
  });

  it("keeps local data when a background remote refresh fails", async () => {
    const store = storeMock([localMoment]);

    await expect(
      loadLocalFirstResource({
        store,
        userId: "user-1",
        resource: "moments",
        online: true,
        remoteLoader: () => Promise.reject(new Error("network unavailable")),
        onBackgroundRefresh: vi.fn(),
      }),
    ).resolves.toHaveLength(1);
  });

  it("surfaces the remote error when no local state exists", async () => {
    const store = storeMock();

    await expect(
      loadLocalFirstResource({
        store,
        userId: "user-1",
        resource: "moments",
        online: true,
        remoteLoader: () => Promise.reject(new Error("unauthorized")),
        onBackgroundRefresh: vi.fn(),
      }),
    ).rejects.toThrow("unauthorized");
  });
});
