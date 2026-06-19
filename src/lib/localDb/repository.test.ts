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
  idbGet: vi.fn(async (storeName: StoreName, key: string) => db.stores[storeName].get(key)),
  idbGetAll: vi.fn(async (storeName: StoreName, indexName?: string, query?: { value?: unknown }) => {
    const rows = [...db.stores[storeName].values()];

    if (storeName === "entities" && indexName === "userCollection" && Array.isArray(query?.value)) {
      const [userId, collection] = query.value;
      return rows.filter(
        (row) =>
          (row as LocalEntity).userId === userId &&
          (row as LocalEntity).collection === collection,
      );
    }

    return rows;
  }),
  idbPut: vi.fn(async (storeName: StoreName, value: { key?: string; id?: string }) => {
    const key = value.key ?? value.id;
    if (!key) throw new Error("Missing key");
    db.stores[storeName].set(key, value);
    return key;
  }),
  idbDelete: vi.fn(async (storeName: StoreName, key: string) => {
    db.stores[storeName].delete(key);
  }),
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

    const rows = await repository.readEntities<{ id: number; content: string }>("user-1", "moments");
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

    const rows = await repository.readEntities<{ id: number; content: string }>("user-1", "moments");
    expect(rows).toEqual([
      expect.objectContaining({
        id: 1,
        content: "remote",
        _local: { pending: false, failed: false, deleted: false },
      }),
    ]);
    expect(await repository.readEntity("user-1", "moments", 999)).toBeUndefined();
  });

  it("marks every local duplicate with the same client_id as deleted", async () => {
    await repository.upsertEntity("user-1", "goals", { id: 999, client_id: "goal-client" });
    await repository.upsertEntity("user-1", "goals", { id: 1, client_id: "goal-client" });

    await repository.markEntityDeleted("user-1", "goals", 999);

    expect(await repository.readEntities("user-1", "goals")).toEqual([]);
  });
});
