import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OutboxItem } from "./types";

const mocks = vi.hoisted(() => ({
  sessionUser: { id: "user-1" } as { id: string } | null,
  outboxItems: [] as OutboxItem[],
  updatePayloads: [] as Record<string, unknown>[],
  maybeSingleResult: { data: { id: 1, client_id: "moment-client" }, error: null },
  markOutboxItem: vi.fn(),
  removeOutboxItem: vi.fn(),
  recoverStaleOutboxItems: vi.fn(),
  readEntity: vi.fn(),
  readLocalFile: vi.fn(),
  removeEntitiesByClientId: vi.fn(),
  removeEntity: vi.fn(),
  removeLocalFile: vi.fn(),
  upsertEntity: vi.fn(),
  upsertSyncedEntity: vi.fn(),
  storageRemove: vi.fn(),
  storageUpload: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: mocks.sessionUser ? { user: mocks.sessionUser } : null },
      })),
    },
    from: vi.fn(() => ({
      update: vi.fn((payload: Record<string, unknown>) => {
        mocks.updatePayloads.push(payload);
        const builder = {
          eq: vi.fn(() => builder),
          select: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => mocks.maybeSingleResult),
        };
        return builder;
      }),
      delete: vi.fn(() => {
        throw new Error("hard delete should not be used");
      }),
    })),
    storage: {
      from: vi.fn(() => ({
        remove: mocks.storageRemove,
        upload: mocks.storageUpload,
      })),
    },
  },
}));

vi.mock("./repository", () => ({
  readEntity: mocks.readEntity,
  readLocalFile: mocks.readLocalFile,
  removeEntitiesByClientId: mocks.removeEntitiesByClientId,
  removeEntity: mocks.removeEntity,
  removeLocalFile: mocks.removeLocalFile,
  upsertEntity: mocks.upsertEntity,
  upsertSyncedEntity: mocks.upsertSyncedEntity,
}));

vi.mock("./syncQueue", () => ({
  getOutboxItems: vi.fn(async () => mocks.outboxItems),
  markOutboxItem: mocks.markOutboxItem,
  recoverStaleOutboxItems: mocks.recoverStaleOutboxItems,
  removeOutboxItem: mocks.removeOutboxItem,
}));

const { flushOutbox } = await import("./syncEngine");

function outboxItem(overrides: Partial<OutboxItem>): OutboxItem {
  return {
    id: "outbox-1",
    userId: "user-1",
    collection: "moments",
    entityId: "moment-client",
    operation: "delete",
    payload: {
      id: 1,
      client_id: "moment-client",
      user_id: "user-1",
      image_path: "user-1/photo.jpg",
      deleted_at: "2026-01-01T00:00:00.000Z",
    },
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("syncEngine", () => {
  beforeEach(() => {
    mocks.sessionUser = { id: "user-1" };
    mocks.outboxItems = [];
    mocks.updatePayloads = [];
    mocks.maybeSingleResult = {
      data: { id: 1, client_id: "moment-client" },
      error: null,
    };
    mocks.markOutboxItem.mockReset();
    mocks.removeOutboxItem.mockReset();
    mocks.recoverStaleOutboxItems.mockReset();
    mocks.readEntity.mockReset();
    mocks.readLocalFile.mockReset();
    mocks.removeEntitiesByClientId.mockReset();
    mocks.removeEntity.mockReset();
    mocks.removeLocalFile.mockReset();
    mocks.upsertEntity.mockReset();
    mocks.upsertSyncedEntity.mockReset();
    mocks.storageRemove.mockReset();
    mocks.storageRemove.mockResolvedValue({ error: null });
    mocks.storageUpload.mockReset();
    mocks.storageUpload.mockResolvedValue({ error: null });
  });

  it("soft-deletes remote rows and removes stored files", async () => {
    mocks.outboxItems = [outboxItem({})];

    await flushOutbox();

    expect(mocks.updatePayloads).toEqual([
      { deleted_at: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(mocks.storageRemove).toHaveBeenCalledWith(["user-1/photo.jpg"]);
    expect(mocks.removeEntitiesByClientId).toHaveBeenCalledWith(
      "user-1",
      "moments",
      "moment-client",
    );
    expect(mocks.removeOutboxItem).toHaveBeenCalledWith("outbox-1");
  });

  it("marks an update failed when the remote row is missing", async () => {
    const currentEntity = {
      data: { id: 1, client_id: "moment-client", content: "local" },
      updatedAt: "2026-01-01T00:00:00.000Z",
      deleted: false,
    };
    mocks.outboxItems = [
      outboxItem({
        operation: "update",
        payload: {
          id: 1,
          client_id: "moment-client",
          user_id: "user-1",
          content: "local",
        },
      }),
    ];
    mocks.maybeSingleResult = { data: null, error: null };
    mocks.readEntity.mockResolvedValue(currentEntity);

    await flushOutbox();

    expect(mocks.removeOutboxItem).not.toHaveBeenCalled();
    expect(mocks.markOutboxItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "outbox-1" }),
      "failed",
      "Remote row not found for update",
    );
    expect(mocks.upsertEntity).toHaveBeenCalledWith(
      "user-1",
      "moments",
      currentEntity.data,
      expect.objectContaining({ failed: true }),
    );
  });

  it("uploads queued local files by reference and removes them after sync", async () => {
    mocks.readLocalFile.mockResolvedValue({
      id: "file-1",
      userId: "user-1",
      bucket: "moments",
      path: "",
      blob: new Blob(["photo"]),
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    mocks.maybeSingleResult = {
      data: {
        id: 1,
        client_id: "moment-client",
        image_path: "user-1/uploaded.jpg",
      },
      error: null,
    };
    mocks.outboxItems = [
      outboxItem({
        operation: "update",
        payload: {
          id: 1,
          client_id: "moment-client",
          user_id: "user-1",
          content: "with photo",
          local_file_id: "file-1",
          local_file_name: "photo.jpg",
          previous_image_path: "user-1/old.jpg",
        },
      }),
    ];

    await flushOutbox();

    expect(mocks.storageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/\d+-moment-client\.jpg$/),
      expect.any(Blob),
      { cacheControl: "3600", upsert: true },
    );
    expect(mocks.updatePayloads[0]).toMatchObject({
      content: "with photo",
      image_path: expect.stringMatching(/^user-1\/\d+-moment-client\.jpg$/),
    });
    expect(mocks.updatePayloads[0]).not.toHaveProperty("local_file_id");
    expect(mocks.updatePayloads[0]).not.toHaveProperty("local_file_name");
    expect(mocks.storageRemove).toHaveBeenCalledWith(["user-1/old.jpg"]);
    expect(mocks.removeLocalFile).toHaveBeenCalledWith("file-1");
  });
});
