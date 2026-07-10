import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AnyConflictRecord,
  AnyMutationRecord,
  AnySnapshotRecord,
  DataResource,
  MutationBlobRecord,
} from "./types";

const DEFAULT_DATABASE_NAME = "bullet-ai-data-v2";
const DATABASE_VERSION = 3;

export type CollectionStateRecord = {
  key: string;
  userId: string;
  resource: DataResource;
  syncedAt: string;
  lastAccessedAt: string;
};

export interface DataV2Schema extends DBSchema {
  collections: {
    key: string;
    value: CollectionStateRecord;
    indexes: { "by-user": string };
  };
  snapshots: {
    key: string;
    value: AnySnapshotRecord;
    indexes: {
      "by-user": string;
      "by-user-resource": [string, DataResource];
      "by-last-accessed": string;
    };
  };
  mutations: {
    key: string;
    value: AnyMutationRecord;
    indexes: {
      "by-user": string;
      "by-user-resource": [string, DataResource];
      "by-user-status": [string, string];
      "by-user-entity": [string, DataResource, string];
      "by-next-attempt": string;
    };
  };
  blobs: {
    key: string;
    value: MutationBlobRecord;
    indexes: {
      "by-user": string;
      "by-mutation": string;
    };
  };
  conflicts: {
    key: string;
    value: AnyConflictRecord;
    indexes: {
      "by-user": string;
      "by-mutation": string;
      "by-user-entity": [string, DataResource, string];
    };
  };
}

export function dataEntityKey(
  userId: string,
  resource: DataResource,
  clientId: string,
) {
  return `${userId}:${resource}:${clientId}`;
}

function createSchema(db: IDBPDatabase<DataV2Schema>) {
  if (!db.objectStoreNames.contains("collections")) {
    const collections = db.createObjectStore("collections", { keyPath: "key" });
    collections.createIndex("by-user", "userId");
  }
  if (!db.objectStoreNames.contains("snapshots")) {
    const snapshots = db.createObjectStore("snapshots", { keyPath: "key" });
    snapshots.createIndex("by-user", "userId");
    snapshots.createIndex("by-user-resource", ["userId", "resource"]);
    snapshots.createIndex("by-last-accessed", "lastAccessedAt");
  }
  if (!db.objectStoreNames.contains("mutations")) {
    const mutations = db.createObjectStore("mutations", {
      keyPath: "mutationId",
    });
    mutations.createIndex("by-user", "userId");
    mutations.createIndex("by-user-resource", ["userId", "resource"]);
    mutations.createIndex("by-user-status", ["userId", "status"]);
    mutations.createIndex("by-user-entity", ["userId", "resource", "clientId"]);
    mutations.createIndex("by-next-attempt", "nextAttemptAt");
  }
  if (!db.objectStoreNames.contains("blobs")) {
    const blobs = db.createObjectStore("blobs", { keyPath: "blobId" });
    blobs.createIndex("by-user", "userId");
    blobs.createIndex("by-mutation", "mutationId");
  }
  if (!db.objectStoreNames.contains("conflicts")) {
    const conflicts = db.createObjectStore("conflicts", {
      keyPath: "conflictId",
    });
    conflicts.createIndex("by-user", "userId");
    conflicts.createIndex("by-mutation", "mutationId");
    conflicts.createIndex("by-user-entity", ["userId", "resource", "clientId"]);
  }
}

export class DataV2Database {
  private databasePromise: Promise<IDBPDatabase<DataV2Schema>> | null = null;
  private readonly clearedUsers = new Set<string>();
  private readonly userSessionTokens = new Map<string, number>();

  constructor(private readonly databaseName = DEFAULT_DATABASE_NAME) {}

  isUserCleared(userId: string) {
    return this.clearedUsers.has(userId);
  }

  beginUserSession(userId: string) {
    const token = this.getUserSessionToken(userId) + 1;
    this.userSessionTokens.set(userId, token);
    this.clearedUsers.delete(userId);
    return token;
  }

  getUserSessionToken(userId: string) {
    return this.userSessionTokens.get(userId) ?? 0;
  }

  isUserSessionCurrent(userId: string, token: number) {
    return (
      !this.clearedUsers.has(userId) &&
      this.getUserSessionToken(userId) === token
    );
  }

  open() {
    if (!this.databasePromise) {
      this.databasePromise = openDB<DataV2Schema>(
        this.databaseName,
        DATABASE_VERSION,
        { upgrade: (db) => createSchema(db) },
      );
    }
    return this.databasePromise;
  }

  async clearUser(userId: string) {
    // Set the barrier before awaiting IndexedDB so late callbacks cannot restore data.
    this.userSessionTokens.set(userId, this.getUserSessionToken(userId) + 1);
    this.clearedUsers.add(userId);
    const db = await this.open();
    const transaction = db.transaction(
      ["collections", "snapshots", "mutations", "blobs", "conflicts"],
      "readwrite",
    );
    const [collections, snapshots, mutations, blobs, conflicts] =
      await Promise.all([
        transaction.objectStore("collections").index("by-user").getAll(userId),
        transaction.objectStore("snapshots").index("by-user").getAll(userId),
        transaction.objectStore("mutations").index("by-user").getAll(userId),
        transaction.objectStore("blobs").index("by-user").getAll(userId),
        transaction.objectStore("conflicts").index("by-user").getAll(userId),
      ]);
    await Promise.all([
      ...collections.map((collection) =>
        transaction.objectStore("collections").delete(collection.key),
      ),
      ...snapshots.map((snapshot) =>
        transaction.objectStore("snapshots").delete(snapshot.key),
      ),
      ...mutations.map((mutation) =>
        transaction.objectStore("mutations").delete(mutation.mutationId),
      ),
      ...blobs.map((blob) =>
        transaction.objectStore("blobs").delete(blob.blobId),
      ),
      ...conflicts.map((conflict) =>
        transaction.objectStore("conflicts").delete(conflict.conflictId),
      ),
    ]);
    await transaction.done;
  }

  async close() {
    if (!this.databasePromise) return;
    const db = await this.databasePromise;
    db.close();
    this.databasePromise = null;
  }

  async delete() {
    await this.close();
    await deleteDB(this.databaseName);
  }
}
