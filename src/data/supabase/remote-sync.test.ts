import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MomentEntity } from "../../domain/entities";
import type { DataStoreApi } from "../local";

const mocks = vi.hoisted(() => ({
  loadWatermark: vi.fn(),
  loadChangePage: vi.fn(),
  loadEntities: vi.fn(),
  loadResource: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("./change-reader", () => ({
  loadRemoteChangeWatermark: mocks.loadWatermark,
  loadRemoteChangePage: mocks.loadChangePage,
  loadRemoteEntitiesByClientId: mocks.loadEntities,
}));
vi.mock("./resource-reader", () => ({
  loadRemoteResource: mocks.loadResource,
}));
vi.mock("../../lib/observability/logger", () => ({ logger: mocks.logger }));

const { synchronizeRemoteResource } = await import("./remote-sync");

function moment(clientId: string, version = 1): MomentEntity {
  return {
    clientId,
    userId: "user-1",
    version,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    content: clientId,
    occurredOn: "2026-07-10",
    imagePath: null,
  };
}

function storeHarness(cursor: string | null) {
  return {
    getUserSessionToken: vi.fn(() => 7),
    getRemoteCursor: vi.fn(async () => cursor),
    replaceSnapshots: vi.fn(async () => undefined),
    applyRemoteDelta: vi.fn(async () => undefined),
  } as unknown as DataStoreApi;
}

describe("synchronizeRemoteResource", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => {
      if ("mockReset" in mock) mock.mockReset();
    });
  });

  it("captures a watermark before committing a full baseline", async () => {
    const store = storeHarness(null);
    mocks.loadWatermark.mockResolvedValue("12");
    mocks.loadResource.mockResolvedValue([moment("moment-1")]);

    await synchronizeRemoteResource({
      store,
      userId: "user-1",
      resource: "moments",
    });

    expect(mocks.loadWatermark).toHaveBeenCalledBefore(mocks.loadResource);
    expect(store.replaceSnapshots).toHaveBeenCalledWith(
      "user-1",
      "moments",
      [expect.objectContaining({ clientId: "moment-1" })],
      expect.objectContaining({ remoteCursor: "12", sessionToken: 7 }),
    );
    expect(store.applyRemoteDelta).not.toHaveBeenCalled();
  });

  it("pulls every change page and resolves physical deletions from current rows", async () => {
    const store = storeHarness("12");
    mocks.loadChangePage
      .mockResolvedValueOnce({
        changes: [
          {
            sequence: "13",
            resource: "moments",
            clientId: "moment-updated",
            operation: "upsert",
            version: 2,
          },
          {
            sequence: "14",
            resource: "moments",
            clientId: "moment-deleted",
            operation: "delete",
            version: 1,
          },
        ],
        nextCursor: "14",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        changes: [
          {
            sequence: "15",
            resource: "moments",
            clientId: "moment-later",
            operation: "upsert",
            version: 1,
          },
        ],
        nextCursor: "15",
        hasMore: false,
      });
    mocks.loadEntities
      .mockResolvedValueOnce([moment("moment-updated", 2)])
      .mockResolvedValueOnce([moment("moment-later")]);

    await synchronizeRemoteResource({
      store,
      userId: "user-1",
      resource: "moments",
    });

    expect(mocks.loadChangePage).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "moments",
      "12",
    );
    expect(mocks.loadChangePage).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "moments",
      "14",
    );
    expect(mocks.loadEntities).toHaveBeenNthCalledWith(1, "user-1", "moments", [
      "moment-updated",
    ]);
    expect(store.applyRemoteDelta).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "moments",
      expect.objectContaining({
        remoteCursor: "14",
        deletedClientIds: ["moment-deleted"],
        resetClientIds: [],
        upserts: [expect.objectContaining({ clientId: "moment-updated" })],
      }),
    );
    expect(store.applyRemoteDelta).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "moments",
      expect.objectContaining({ remoteCursor: "15" }),
    );
  });

  it("uses each entity's last page operation and marks delete-recreate resets", async () => {
    const store = storeHarness("40");
    mocks.loadChangePage.mockResolvedValue({
      changes: [
        {
          sequence: "41",
          resource: "moments",
          clientId: "moment-recreated",
          operation: "delete",
          version: 5,
        },
        {
          sequence: "42",
          resource: "moments",
          clientId: "moment-deleted",
          operation: "upsert",
          version: 2,
        },
        {
          sequence: "43",
          resource: "moments",
          clientId: "moment-recreated",
          operation: "upsert",
          version: 1,
        },
        {
          sequence: "44",
          resource: "moments",
          clientId: "moment-deleted",
          operation: "delete",
          version: 2,
        },
      ],
      nextCursor: "44",
      hasMore: false,
    });
    mocks.loadEntities.mockResolvedValue([moment("moment-recreated", 1)]);

    await synchronizeRemoteResource({
      store,
      userId: "user-1",
      resource: "moments",
    });

    expect(mocks.loadEntities).toHaveBeenCalledWith("user-1", "moments", [
      "moment-recreated",
    ]);
    expect(store.applyRemoteDelta).toHaveBeenCalledWith(
      "user-1",
      "moments",
      expect.objectContaining({
        upserts: [expect.objectContaining({ clientId: "moment-recreated" })],
        deletedClientIds: ["moment-deleted"],
        resetClientIds: ["moment-recreated"],
        remoteCursor: "44",
      }),
    );
  });

  it("does no snapshot work when the cursor is already current", async () => {
    const store = storeHarness("20");
    mocks.loadChangePage.mockResolvedValue({
      changes: [],
      nextCursor: "20",
      hasMore: false,
    });

    await synchronizeRemoteResource({
      store,
      userId: "user-1",
      resource: "moments",
    });

    expect(store.applyRemoteDelta).not.toHaveBeenCalled();
    expect(store.replaceSnapshots).not.toHaveBeenCalled();
  });
});
