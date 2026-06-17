const DB_NAME = "bullet-ai-local-first";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function createStore(db: IDBDatabase, name: string, options: IDBObjectStoreParameters) {
  if (!db.objectStoreNames.contains(name)) {
    return db.createObjectStore(name, options);
  }
  return null;
}

export function openLocalDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      const entities = createStore(db, "entities", { keyPath: "key" });
      if (entities) {
        entities.createIndex("userCollection", ["userId", "collection"], { unique: false });
        entities.createIndex("collection", "collection", { unique: false });
      }

      const outbox = createStore(db, "outbox", { keyPath: "id" });
      if (outbox) {
        outbox.createIndex("status", "status", { unique: false });
        outbox.createIndex("userId", "userId", { unique: false });
        outbox.createIndex("entity", ["userId", "collection", "entityId"], { unique: false });
      }

      const files = createStore(db, "files", { keyPath: "id" });
      if (files) {
        files.createIndex("userId", "userId", { unique: false });
      }

      createStore(db, "meta", { keyPath: "key" });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });

  return dbPromise;
}

export async function getStore(
  storeName: string,
  mode: IDBTransactionMode = "readonly",
): Promise<IDBObjectStore> {
  const db = await openLocalDb();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
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

export async function idbPut<T>(storeName: string, value: T): Promise<IDBValidKey> {
  const store = await getStore(storeName, "readwrite");
  return requestToPromise<IDBValidKey>(store.put(value));
}

export async function idbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  const store = await getStore(storeName, "readwrite");
  await requestToPromise(store.delete(key));
}
