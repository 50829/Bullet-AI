import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OutboxItem } from "./types";

type MaybeSingleResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

const mocks = vi.hoisted(() => ({
  sessionUser: { id: "user-1" } as { id: string } | null,
  outboxItems: [] as OutboxItem[],
  deadOutboxCount: 0,
  updatePayloads: [] as Record<string, unknown>[],
  upsertPayloads: [] as Record<string, unknown>[],
  upsertOptions: [] as Record<string, unknown>[],
  eqCalls: [] as Array<[string, string | number]>,
  maybeSingleResult: {
    data: { id: 1, client_id: "moment-client" },
    error: null,
  } as MaybeSingleResult,
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
  updateOutboxItem: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: mocks.sessionUser ? { user: mocks.sessionUser } : null,
        },
      })),
    },
    from: vi.fn(() => ({
      update: vi.fn((payload: Record<string, unknown>) => {
        mocks.updatePayloads.push(payload);
        const builder = {
          eq: vi.fn((column: string, value: string | number) => {
            mocks.eqCalls.push([column, value]);
            return builder;
          }),
          select: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => mocks.maybeSingleResult),
        };
        return builder;
      }),
      delete: vi.fn(() => {
        throw new Error("hard delete should not be used");
      }),
      upsert: vi.fn(
        (
          payload: Record<string, unknown>,
          options: Record<string, unknown>,
        ) => {
          mocks.upsertPayloads.push(payload);
          mocks.upsertOptions.push(options);
          const builder = {
            select: vi.fn(() => builder),
            maybeSingle: vi.fn(async () => mocks.maybeSingleResult),
          };
          return builder;
        },
      ),
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
  getDeadOutboxCount: vi.fn(async () => mocks.deadOutboxCount),
  getOutboxItems: vi.fn(async () => mocks.outboxItems),
  markOutboxItem: vi.fn(
    async (
      item: OutboxItem,
      status: OutboxItem["status"],
      options?: string | { error?: string; errorKind?: string },
    ) => {
      const current =
        mocks.outboxItems.find((entry) => entry.id === item.id) ?? item;
      const attemptCount =
        status === "syncing"
          ? (current.attemptCount ?? 0) + 1
          : current.attemptCount;
      const error = typeof options === "string" ? options : options?.error;
      const errorKind =
        typeof options === "string" ? undefined : options?.errorKind;
      const next = {
        ...current,
        status:
          status === "failed" &&
          (errorKind === "not_found" || errorKind === "permanent")
            ? "dead"
            : status,
        attemptCount,
        error,
        errorKind,
      } as OutboxItem;
      mocks.markOutboxItem(item, status, options);
      const index = mocks.outboxItems.findIndex(
        (entry) => entry.id === item.id,
      );
      if (index >= 0) mocks.outboxItems[index] = next;
      return next;
    },
  ),
  recoverStaleOutboxItems: mocks.recoverStaleOutboxItems,
  removeOutboxItem: mocks.removeOutboxItem,
  updateOutboxItem: vi.fn(async (item: OutboxItem) => {
    mocks.updateOutboxItem(item);
    const index = mocks.outboxItems.findIndex((entry) => entry.id === item.id);
    if (index >= 0) mocks.outboxItems[index] = item;
    return item;
  }),
}));

const { flushOutbox, getSyncStatus } = await import("./syncEngine");

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
    mocks.deadOutboxCount = 0;
    mocks.updatePayloads = [];
    mocks.upsertPayloads = [];
    mocks.upsertOptions = [];
    mocks.eqCalls = [];
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
    mocks.updateOutboxItem.mockReset();
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

  it("keeps sync status failed when only dead-lettered items remain", async () => {
    mocks.deadOutboxCount = 1;

    await flushOutbox();

    expect(getSyncStatus()).toBe("failed");
    expect(mocks.removeOutboxItem).not.toHaveBeenCalled();
  });

  it("cascades habit deletes to checkins without treating habits as storage-backed", async () => {
    mocks.outboxItems = [
      outboxItem({
        collection: "habits",
        entityId: "habit-client",
        payload: {
          id: 1,
          client_id: "habit-client",
          user_id: "user-1",
          image_path: "user-1/should-not-exist.jpg",
          deleted_at: "2026-01-01T00:00:00.000Z",
        },
      }),
    ];

    await flushOutbox();

    expect(mocks.updatePayloads).toEqual([
      { deleted_at: "2026-01-01T00:00:00.000Z" },
      { deleted_at: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(mocks.storageRemove).not.toHaveBeenCalled();
    expect(mocks.eqCalls).toContainEqual([
      "habit_client_id",
      "habit-client",
    ]);
    expect(mocks.removeEntitiesByClientId).toHaveBeenCalledWith(
      "user-1",
      "habits",
      "habit-client",
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
      expect.objectContaining({
        error: "Remote row not found for update",
        errorKind: "not_found",
      }),
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

  it("persists uploaded file paths so table-write retries do not re-upload", async () => {
    mocks.readLocalFile.mockResolvedValue({
      id: "file-1",
      userId: "user-1",
      bucket: "moments",
      path: "",
      blob: new Blob(["photo"]),
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    mocks.maybeSingleResult = { data: null, error: { message: "db offline" } };
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
        },
      }),
    ];

    await flushOutbox();

    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
    expect(mocks.updateOutboxItem).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          uploaded_image_path: expect.stringMatching(
            /^user-1\/\d+-moment-client\.jpg$/,
          ),
        }),
      }),
    );

    mocks.markOutboxItem.mockClear();
    mocks.updatePayloads = [];
    mocks.maybeSingleResult = {
      data: {
        id: 1,
        client_id: "moment-client",
        image_path: "user-1/uploaded.jpg",
      },
      error: null,
    };

    await flushOutbox();

    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
    expect(mocks.updatePayloads[0]).toMatchObject({
      image_path: expect.stringMatching(/^user-1\/\d+-moment-client\.jpg$/),
    });
  });

  it("syncs profiles through the outbox using user_id as the conflict target", async () => {
    mocks.maybeSingleResult = {
      data: {
        user_id: "user-1",
        username: "Mira",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    };
    mocks.outboxItems = [
      outboxItem({
        collection: "profiles",
        entityId: "user-1",
        operation: "upsert",
        payload: {
          user_id: "user-1",
          username: "Mira",
          updated_at: "2026-01-01T00:00:00.000Z",
          preferred_language: "zh",
          ui_theme: "calm",
          accent_color: "sage",
          color_scheme: "system",
          completed_goal_retention: "next_day",
          week_starts_on: "auto",
        },
      }),
    ];

    await flushOutbox();

    expect(mocks.upsertPayloads).toEqual([
      expect.objectContaining({
        user_id: "user-1",
        username: "Mira",
      }),
    ]);
    expect(mocks.upsertOptions).toEqual([{ onConflict: "user_id" }]);
    expect(mocks.upsertSyncedEntity).toHaveBeenCalledWith(
      "user-1",
      "profiles",
      expect.objectContaining({ user_id: "user-1", username: "Mira" }),
      expect.objectContaining({ localEntityId: "user-1" }),
    );
  });
});
