const DB_NAME = "bullet-ai-local-first";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

type LocalDbIndexSchema = {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
};

type LocalDbStoreSchema = {
  name: string;
  options: IDBObjectStoreParameters;
  indexes?: LocalDbIndexSchema[];
};

type LocalDbMigrationContext = {
  db: IDBDatabase;
  transaction: IDBTransaction | null;
};

type LocalDbMigration = {
  version: number;
  upgrade: (context: LocalDbMigrationContext) => void;
};

export const LOCAL_DB_VERSION = DB_VERSION;

export const LOCAL_DB_STORES: LocalDbStoreSchema[] = [
  {
    name: "entities",
    options: { keyPath: "key" },
    indexes: [
      {
        name: "userCollection",
        keyPath: ["userId", "collection"],
        options: { unique: false },
      },
      { name: "collection", keyPath: "collection", options: { unique: false } },
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
    indexes: [{ name: "userId", keyPath: "userId", options: { unique: false } }],
  },
  { name: "meta", options: { keyPath: "key" } },
];

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function createStore(
  db: IDBDatabase,
  name: string,
  options: IDBObjectStoreParameters,
) {
  if (!db.objectStoreNames.contains(name)) {
    return db.createObjectStore(name, options);
  }
  return null;
}

function createIndexes(
  store: IDBObjectStore,
  indexes: LocalDbIndexSchema[] = [],
) {
  for (const index of indexes) {
    if (!store.indexNames.contains(index.name)) {
      store.createIndex(index.name, index.keyPath, index.options);
    }
  }
}

function createStoreFromSchema(db: IDBDatabase, schema: LocalDbStoreSchema) {
  const store = createStore(db, schema.name, schema.options);
  if (store) createIndexes(store, schema.indexes);
}

function createInitialSchema({ db }: LocalDbMigrationContext) {
  for (const storeSchema of LOCAL_DB_STORES) {
    createStoreFromSchema(db, storeSchema);
  }
}

const LOCAL_DB_MIGRATIONS: LocalDbMigration[] = [
  {
    version: 1,
    upgrade: createInitialSchema,
  },
  // Add future schema changes as new version entries and bump DB_VERSION once.
  // Keep older migrations append-only so existing browsers can upgrade safely.
];

export function getPendingLocalDbMigrationVersions(
  oldVersion: number,
  targetVersion = DB_VERSION,
) {
  return LOCAL_DB_MIGRATIONS.filter(
    (migration) =>
      migration.version > oldVersion && migration.version <= targetVersion,
  ).map((migration) => migration.version);
}

export function applyLocalDbMigrations(
  context: LocalDbMigrationContext,
  oldVersion: number,
  targetVersion = DB_VERSION,
) {
  for (const migration of LOCAL_DB_MIGRATIONS) {
    if (migration.version > oldVersion && migration.version <= targetVersion) {
      migration.upgrade(context);
    }
  }
}

export function openLocalDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB is not available in this environment"),
    );
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      applyLocalDbMigrations(
        { db: request.result, transaction: request.transaction },
        event.oldVersion,
        DB_VERSION,
      );
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });

  return dbPromise;
}

export async function closeLocalDb() {
  if (!dbPromise) return;

  try {
    const db = await dbPromise;
    db.close();
  } finally {
    dbPromise = null;
  }
}

export async function deleteLocalDb(): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  await closeLocalDb();

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete IndexedDB"));
    request.onblocked = () =>
      reject(new Error("IndexedDB deletion is blocked by another tab"));
  });
}

export async function getStore(
  storeName: string,
  mode: IDBTransactionMode = "readonly",
): Promise<IDBObjectStore> {
  const db = await openLocalDb();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function idbGet<T>(
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  const store = await getStore(storeName);
  return requestToPromise<T | undefined>(store.get(key));
}

export async function idbGetAll<T>(
  storeName: string,
  indexName?: string,
  query?: IDBValidKey | IDBKeyRange,
): Promise<T[]> {
  const store = await getStore(storeName);
  const source = indexName ? store.index(indexName) : store;
  return requestToPromise<T[]>(source.getAll(query));
}

export async function idbPut<T>(
  storeName: string,
  value: T,
): Promise<IDBValidKey> {
  const store = await getStore(storeName, "readwrite");
  return requestToPromise<IDBValidKey>(store.put(value));
}

export async function idbDelete(
  storeName: string,
  key: IDBValidKey,
): Promise<void> {
  const store = await getStore(storeName, "readwrite");
  await requestToPromise(store.delete(key));
}

export async function runIdbTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  operation: (stores: Record<string, IDBObjectStore>) => Promise<T>,
): Promise<T> {
  const db = await openLocalDb();
  const transaction = db.transaction(storeNames, mode);
  const stores = Object.fromEntries(
    storeNames.map((storeName) => [
      storeName,
      transaction.objectStore(storeName),
    ]),
  );

  const completed = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });

  try {
    const result = await operation(stores);
    await completed;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already be completed or aborted.
    }
    try {
      await completed;
    } catch {
      // Preserve the original operation error.
    }
    throw error;
  }
}

export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return requestToPromise(request);
}
