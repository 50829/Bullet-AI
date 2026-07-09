import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalEntity } from "./types";

type StoreName = "entities" | "meta" | "outbox" | "files";

const db = vi.hoisted(() => ({
  stores: {
    entities: new Map<string, unknown>(),
    meta: new Map<string, unknown>(),
    outbox: new Map<string, unknown>(),
    files: new Map<string, unknown>(),
  } as Record<StoreName, Map<string, unknown>>,
}));

vi.mock("./indexedDb", () => ({
  idbGet: vi.fn(async (storeName: StoreName, key: string) =>
    db.stores[storeName].get(key),
  ),
  idbGetAll: vi.fn(
    async (
      storeName: StoreName,
      indexName?: string,
      query?: { value?: unknown },
    ) => {
      const rows = [...db.stores[storeName].values()];

      if (
        storeName === "entities" &&
        indexName === "userCollection" &&
        Array.isArray(query?.value)
      ) {
        const [userId, collection] = query.value;
        return rows.filter(
          (row) =>
            (row as LocalEntity).userId === userId &&
            (row as LocalEntity).collection === collection,
        );
      }

      return rows;
    },
  ),
  idbPut: vi.fn(
    async (storeName: StoreName, value: { key?: string; id?: string }) => {
      const key = value.key ?? value.id;
      if (!key) throw new Error("Missing key");
      db.stores[storeName].set(key, value);
      return key;
    },
  ),
  idbDelete: vi.fn(async (storeName: StoreName, key: string) => {
    db.stores[storeName].delete(key);
  }),
  idbRequest: vi.fn(async (request: Promise<unknown>) => request),
  runIdbTransaction: vi.fn(
    async (
      _storeNames: string[],
      _mode: string,
      operation: (stores: Record<string, unknown>) => Promise<unknown>,
    ) => {
      const objectStore = (storeName: StoreName) => ({
        get: (key: string) => Promise.resolve(db.stores[storeName].get(key)),
        put: (value: { key?: string; id?: string }) => {
          const key = value.key ?? value.id;
          if (!key) return Promise.reject(new Error("Missing key"));
          db.stores[storeName].set(key, value);
          return Promise.resolve(key);
        },
        delete: (key: string) => {
          db.stores[storeName].delete(key);
          return Promise.resolve(undefined);
        },
        index: () => ({
          getAll: (query: { value?: unknown }) => {
            const [userId, collection, entityId] = (query.value ??
              []) as string[];
            return Promise.resolve(
              [...db.stores[storeName].values()].filter((value) => {
                const row = value as {
                  userId?: string;
                  collection?: string;
                  entityId?: string;
                };
                return (
                  row.userId === userId &&
                  row.collection === collection &&
                  row.entityId === entityId
                );
              }),
            );
          },
        }),
      });
      return operation({
        entities: objectStore("entities"),
        outbox: objectStore("outbox"),
        files: objectStore("files"),
      });
    },
  ),
}));

Object.defineProperty(globalThis, "IDBKeyRange", {
  configurable: true,
  value: {
    only: (value: unknown) => ({ value }),
  },
});

const repository = await import("./repository");

describe("localDb repository client_id reconciliation", () => {
  beforeEach(() => {
    Object.values(db.stores).forEach((store) => store.clear());
  });

  it("keeps pending local entities when remote data has the same client_id", async () => {
    await repository.upsertEntity(
      "user-1",
      "moments",
      { id: 999, client_id: "moment-client", content: "local" },
      { pending: true },
    );

    await repository.cacheRemoteEntities("user-1", "moments", [
      { id: 1, client_id: "moment-client", content: "remote" },
    ]);

    const rows = await repository.readEntities<{ id: number; content: string }>(
      "user-1",
      "moments",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 999,
      content: "local",
      _local: { pending: true },
    });
  });

  it("replaces synced temporary entities with the remote id", async () => {
    await repository.upsertEntity(
      "user-1",
      "moments",
      { id: 999, client_id: "moment-client", content: "local" },
      { pending: false },
    );

    await repository.cacheRemoteEntities("user-1", "moments", [
      { id: 1, client_id: "moment-client", content: "remote" },
    ]);

    const rows = await repository.readEntities<{ id: number; content: string }>(
      "user-1",
      "moments",
    );
    expect(rows).toEqual([
      expect.objectContaining({
        id: 1,
        content: "remote",
        _local: { pending: false, failed: false, deleted: false },
      }),
    ]);
    expect(
      await repository.readEntity("user-1", "moments", 999),
    ).toBeUndefined();
  });

  it("uses client_id as the stable local entity key", async () => {
    await repository.upsertEntity("user-1", "goals", {
      id: 999,
      client_id: "goal-client",
      title: "temporary",
    });
    await repository.upsertEntity("user-1", "goals", {
      id: 1,
      client_id: "goal-client",
      title: "remote",
    });

    expect(
      await repository.readEntities<{ id: number; title: string }>(
        "user-1",
        "goals",
      ),
    ).toEqual([
      expect.objectContaining({
        id: 1,
        title: "remote",
      }),
    ]);

    await repository.markEntityDeleted("user-1", "goals", 1);

    expect(await repository.readEntities("user-1", "goals")).toEqual([]);
  });

  it("prunes synced local rows that disappeared from a complete remote snapshot", async () => {
    await repository.upsertEntity("user-1", "moments", {
      id: 1,
      client_id: "deleted-remotely",
      content: "stale",
    });

    await repository.cacheRemoteEntities("user-1", "moments", []);

    expect(await repository.readEntities("user-1", "moments")).toEqual([]);
  });

  it("keeps existing synced rows when caching a partial remote page", async () => {
    await repository.upsertEntity("user-1", "moments", {
      id: 1,
      client_id: "older-local",
      content: "older",
    });

    await repository.cacheRemoteEntities(
      "user-1",
      "moments",
      [{ id: 2, client_id: "newer-remote", content: "newer" }],
      { pruneMissing: false },
    );

    expect(
      await repository.readEntities<{ id: number; content: string }>(
        "user-1",
        "moments",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, content: "older" }),
        expect.objectContaining({ id: 2, content: "newer" }),
      ]),
    );
  });

  it("clears the failed marker when a dead-letter retry item is discarded", async () => {
    await repository.upsertEntity(
      "user-1",
      "moments",
      {
        id: 1,
        client_id: "moment-1",
        content: "failed local record",
      },
      { failed: true },
    );

    await repository.clearEntitySyncFailure("user-1", "moments", "moment-1");

    expect(
      await repository.readEntities<{ id: number; content: string }>(
        "user-1",
        "moments",
      ),
    ).toEqual([
      expect.objectContaining({
        content: "failed local record",
        _local: expect.objectContaining({
          pending: false,
          failed: false,
        }),
      }),
    ]);
  });

  it("does not overwrite a newer pending mutation with an older sync response", async () => {
    await repository.upsertEntity(
      "user-1",
      "goals",
      { id: 1, client_id: "goal-client", title: "new local value" },
      { pending: true },
    );

    await repository.upsertSyncedEntity(
      "user-1",
      "goals",
      { id: 1, client_id: "goal-client", title: "old server response" },
      { mutationUpdatedAt: "2000-01-01T00:00:00.000Z" },
    );

    expect(
      await repository.readEntities<{ id: number; title: string }>(
        "user-1",
        "goals",
      ),
    ).toEqual([
      expect.objectContaining({
        title: "new local value",
        _local: expect.objectContaining({ pending: true }),
      }),
    ]);
  });

  it("atomically persists and compacts repeated local mutations", async () => {
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "goals",
      entityId: 99,
      operation: "upsert",
      payload: { id: 99, client_id: "goal-client", title: "first" },
    });
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "goals",
      entityId: 99,
      operation: "update",
      payload: { id: 99, client_id: "goal-client", title: "latest" },
    });

    expect(db.stores.outbox.size).toBe(1);
    expect([...db.stores.outbox.values()][0]).toMatchObject({
      operation: "upsert",
      payload: expect.objectContaining({ title: "latest" }),
    });
    expect(
      await repository.readEntities<{ id: number; title: string }>(
        "user-1",
        "goals",
      ),
    ).toEqual([
      expect.objectContaining({
        title: "latest",
        _local: expect.objectContaining({ pending: true }),
      }),
    ]);
  });

  it("cancels an unsynced create when the entity is deleted before flushing", async () => {
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "goals",
      entityId: "goal-client",
      operation: "upsert",
      payload: { id: 99, client_id: "goal-client", title: "temporary" },
    });
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "goals",
      entityId: "goal-client",
      operation: "delete",
      payload: {
        id: 99,
        client_id: "goal-client",
        deleted_at: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(db.stores.outbox.size).toBe(0);
    expect(await repository.readEntities("user-1", "goals")).toEqual([]);
  });

  it("cancels an unsynced create after local updates and removes queued files", async () => {
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "moments",
      entityId: "moment-client",
      operation: "upsert",
      payload: {
        id: 99,
        client_id: "moment-client",
        content: "temporary",
        local_file: new Blob(["photo"]),
        local_file_name: "photo.jpg",
      },
    });
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "moments",
      entityId: "moment-client",
      operation: "update",
      payload: {
        id: 99,
        client_id: "moment-client",
        content: "updated temporary",
      },
    });
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "moments",
      entityId: "moment-client",
      operation: "delete",
      payload: {
        id: 99,
        client_id: "moment-client",
        deleted_at: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(db.stores.outbox.size).toBe(0);
    expect(db.stores.files.size).toBe(0);
    expect(await repository.readEntities("user-1", "moments")).toEqual([]);
  });

  it("keeps transient file fields out of the cached entity row", async () => {
    await repository.commitLocalMutation({
      userId: "user-1",
      collection: "moments",
      entityId: "moment-client",
      operation: "upsert",
      payload: {
        id: 99,
        client_id: "moment-client",
        content: "with photo",
        image_url: "blob:http://local/1",
        local_file: new Blob(["photo"]),
        local_file_name: "photo.jpg",
        previous_image_path: "user-1/old.jpg",
      },
    });

    const rows = await repository.readEntities<Record<string, unknown>>(
      "user-1",
      "moments",
    );
    expect(rows[0]).not.toHaveProperty("local_file");
    expect(rows[0]).not.toHaveProperty("local_file_name");
    expect(rows[0]).not.toHaveProperty("previous_image_path");
    expect(rows[0]).not.toHaveProperty("image_url");
    expect([...db.stores.outbox.values()][0]).toMatchObject({
      payload: expect.objectContaining({
        local_file_id: "user-1:moments:moment-client",
        previous_image_path: "user-1/old.jpg",
      }),
    });
    expect([...db.stores.outbox.values()][0]).not.toHaveProperty(
      "payload.local_file",
    );
    expect([...db.stores.files.values()][0]).toMatchObject({
      id: "user-1:moments:moment-client",
      userId: "user-1",
      bucket: "moments",
      blob: expect.any(Blob),
    });
  });
});
