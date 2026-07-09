import { describe, expect, it } from "vitest";
import {
  applyLocalDbMigrations,
  getPendingLocalDbMigrationVersions,
  LOCAL_DB_STORES,
  LOCAL_DB_VERSION,
} from "./indexedDb";

function createNameList(names: string[]) {
  return {
    contains: (name: string) => names.includes(name),
  } as DOMStringList;
}

function createDbMock(existingStores: string[] = []) {
  const stores = new Map<
    string,
    {
      options: IDBObjectStoreParameters;
      indexes: Array<{
        name: string;
        keyPath: string | string[];
        options?: IDBIndexParameters;
      }>;
    }
  >();

  for (const storeName of existingStores) {
    stores.set(storeName, { options: {}, indexes: [] });
  }

  const db = {
    objectStoreNames: createNameList(existingStores),
    createObjectStore: (
      name: string,
      options: IDBObjectStoreParameters,
    ) => {
      const indexNames: string[] = [];
      const store = {
        indexNames: createNameList(indexNames),
        createIndex: (
          indexName: string,
          keyPath: string | string[],
          indexOptions?: IDBIndexParameters,
        ) => {
          indexNames.push(indexName);
          stores.get(name)?.indexes.push({
            name: indexName,
            keyPath,
            options: indexOptions,
          });
        },
      } as IDBObjectStore;

      existingStores.push(name);
      stores.set(name, { options, indexes: [] });
      return store;
    },
  } as IDBDatabase;

  return { db, stores };
}

describe("IndexedDB schema migrations", () => {
  it("keeps the current schema at version 1", () => {
    expect(LOCAL_DB_VERSION).toBe(1);
    expect(getPendingLocalDbMigrationVersions(0)).toEqual([1]);
    expect(getPendingLocalDbMigrationVersions(1)).toEqual([]);
  });

  it("describes all v1 stores and indexes in metadata", () => {
    expect(LOCAL_DB_STORES).toEqual([
      {
        name: "entities",
        options: { keyPath: "key" },
        indexes: [
          {
            name: "userCollection",
            keyPath: ["userId", "collection"],
            options: { unique: false },
          },
          {
            name: "collection",
            keyPath: "collection",
            options: { unique: false },
          },
        ],
      },
      {
        name: "outbox",
        options: { keyPath: "id" },
        indexes: [
          { name: "status", keyPath: "status", options: { unique: false } },
          { name: "userId", keyPath: "userId", options: { unique: false } },
          {
            name: "entity",
            keyPath: ["userId", "collection", "entityId"],
            options: { unique: false },
          },
        ],
      },
      {
        name: "files",
        options: { keyPath: "id" },
        indexes: [
          { name: "userId", keyPath: "userId", options: { unique: false } },
        ],
      },
      { name: "meta", options: { keyPath: "key" } },
    ]);
  });

  it("creates the v1 stores and indexes through the migration runner", () => {
    const { db, stores } = createDbMock();

    applyLocalDbMigrations({ db, transaction: null }, 0);

    expect([...stores.entries()]).toEqual([
      [
        "entities",
        {
          options: { keyPath: "key" },
          indexes: [
            {
              name: "userCollection",
              keyPath: ["userId", "collection"],
              options: { unique: false },
            },
            {
              name: "collection",
              keyPath: "collection",
              options: { unique: false },
            },
          ],
        },
      ],
      [
        "outbox",
        {
          options: { keyPath: "id" },
          indexes: [
            { name: "status", keyPath: "status", options: { unique: false } },
            { name: "userId", keyPath: "userId", options: { unique: false } },
            {
              name: "entity",
              keyPath: ["userId", "collection", "entityId"],
              options: { unique: false },
            },
          ],
        },
      ],
      [
        "files",
        {
          options: { keyPath: "id" },
          indexes: [
            { name: "userId", keyPath: "userId", options: { unique: false } },
          ],
        },
      ],
      ["meta", { options: { keyPath: "key" }, indexes: [] }],
    ]);
  });

  it("does not rerun v1 creation for existing v1 databases", () => {
    const { db, stores } = createDbMock(["entities"]);

    applyLocalDbMigrations({ db, transaction: null }, 1);

    expect([...stores.keys()]).toEqual(["entities"]);
  });
});
