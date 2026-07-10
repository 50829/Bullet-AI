import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AnyConflictRecord,
  AnyMutationRecord,
  AnySnapshotRecord,
  DataResource,
  MutationBlobRecord,
} from "./types";
import {
  DATA_DATABASE_NAME,
  DATA_LOGOUT_CLEANUP_STORAGE_PREFIX,
  DATA_LOGOUT_EPOCH_STORAGE_PREFIX,
} from "../protocol";

const DATABASE_VERSION = 3;
const LOGOUT_CLEANUP_STALE_MS = 30_000;
const LOGOUT_CLEANUP_POLL_MS = 20;

// Node tests and browsers where localStorage is unavailable still need Store
// instances in the same JavaScript realm to observe one another's logout.
// localStorage is the cross-tab source; this map is also kept in sync so a
// transient storage failure cannot lower an epoch already observed here.
const logoutEpochFallback = new Map<string, number>();
type LogoutCleanupMarker = {
  epoch: number;
  startedAt: number;
  cleanupId: string;
};

const logoutCleanupFallback = new Map<string, LogoutCleanupMarker>();
const logoutCleanupLocalOnly = new Set<string>();

function logoutEpochStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function logoutEpochKey(userId: string) {
  return `${DATA_LOGOUT_EPOCH_STORAGE_PREFIX}${userId}`;
}

function logoutCleanupKey(userId: string) {
  return `${DATA_LOGOUT_CLEANUP_STORAGE_PREFIX}${userId}`;
}

function parseLogoutCleanup(value: string | null): LogoutCleanupMarker | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as {
      epoch?: unknown;
      startedAt?: unknown;
      cleanupId?: unknown;
    };
    return Number.isSafeInteger(parsed.epoch) &&
      Number.isSafeInteger(parsed.startedAt) &&
      typeof parsed.cleanupId === "string" &&
      parsed.cleanupId.length > 0 &&
      Number(parsed.epoch) >= 0 &&
      Number(parsed.startedAt) >= 0
      ? {
          epoch: Number(parsed.epoch),
          startedAt: Number(parsed.startedAt),
          cleanupId: parsed.cleanupId,
        }
      : null;
  } catch {
    return null;
  }
}

function readLogoutCleanup(userId: string) {
  const fallback = logoutCleanupFallback.get(userId) ?? null;
  let stored: LogoutCleanupMarker | null = null;
  try {
    const storage = logoutEpochStorage();
    stored = parseLogoutCleanup(
      storage?.getItem(logoutCleanupKey(userId)) ?? null,
    );
    if (storage && !stored && !logoutCleanupLocalOnly.has(userId)) {
      logoutCleanupFallback.delete(userId);
      return null;
    }
  } catch {
    // The same-realm fallback remains available.
  }
  if (!stored) return fallback;
  if (!fallback || stored.epoch >= fallback.epoch) {
    logoutCleanupFallback.set(userId, stored);
    return stored;
  }
  return fallback;
}

function beginLogoutCleanup(userId: string, epoch: number) {
  const marker = {
    epoch,
    startedAt: Date.now(),
    cleanupId: crypto.randomUUID(),
  };
  logoutCleanupFallback.set(userId, marker);
  let persisted = false;
  try {
    const storage = logoutEpochStorage();
    storage?.setItem(logoutCleanupKey(userId), JSON.stringify(marker));
    persisted = Boolean(storage);
  } catch {
    // The same-realm barrier remains effective.
  }
  if (persisted) logoutCleanupLocalOnly.delete(userId);
  else logoutCleanupLocalOnly.add(userId);
  return marker;
}

function sameCleanup(
  left: LogoutCleanupMarker | null | undefined,
  right: LogoutCleanupMarker,
) {
  return left?.epoch === right.epoch && left.cleanupId === right.cleanupId;
}

function finishLogoutCleanup(userId: string, marker: LogoutCleanupMarker) {
  if (sameCleanup(logoutCleanupFallback.get(userId), marker)) {
    logoutCleanupFallback.delete(userId);
    logoutCleanupLocalOnly.delete(userId);
  }
  try {
    const storage = logoutEpochStorage();
    const stored = parseLogoutCleanup(
      storage?.getItem(logoutCleanupKey(userId)) ?? null,
    );
    if (sameCleanup(stored, marker)) {
      storage?.removeItem(logoutCleanupKey(userId));
    }
  } catch {
    // A future same-realm read still observes the fallback state correctly.
  }
}

function waitForCleanupPoll() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, LOGOUT_CLEANUP_POLL_MS);
  });
}

function parseLogoutEpoch(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) return 0;
  const epoch = Number(value);
  return Number.isSafeInteger(epoch) &&
    epoch >= 0 &&
    epoch < Number.MAX_SAFE_INTEGER
    ? epoch
    : 0;
}

function readLogoutEpoch(userId: string) {
  const fallback = logoutEpochFallback.get(userId) ?? 0;
  let stored = 0;
  try {
    stored = parseLogoutEpoch(
      logoutEpochStorage()?.getItem(logoutEpochKey(userId)) ?? null,
    );
  } catch {
    // Access can fail independently for getItem and the localStorage getter.
  }
  const epoch = Math.max(fallback, stored);
  logoutEpochFallback.set(userId, epoch);
  return epoch;
}

function advanceLogoutEpoch(userId: string) {
  const epoch = readLogoutEpoch(userId) + 1;
  // Raise the module barrier even when localStorage is disabled or full.
  logoutEpochFallback.set(userId, epoch);
  try {
    logoutEpochStorage()?.setItem(logoutEpochKey(userId), String(epoch));
  } catch {
    // The same-realm barrier above remains effective as a safe fallback.
  }
  return epoch;
}

export type CollectionStateRecord = {
  key: string;
  userId: string;
  resource: DataResource;
  syncedAt: string;
  lastAccessedAt: string;
  /** Last durable workspace_change_log sequence applied for this resource. */
  remoteCursor?: string;
};

export interface DataSchema extends DBSchema {
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

function createSchema(db: IDBPDatabase<DataSchema>) {
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

export class DataDatabase {
  private databasePromise: Promise<IDBPDatabase<DataSchema>> | null = null;
  private readonly clearedUsers = new Set<string>();
  private readonly userSessionTokens = new Map<string, number>();
  private readonly userSessionLogoutEpochs = new Map<string, number>();

  constructor(private readonly databaseName = DATA_DATABASE_NAME) {}

  isUserCleared(userId: string) {
    return this.clearedUsers.has(userId);
  }

  beginUserSession(userId: string) {
    const token = this.getUserSessionToken(userId) + 1;
    this.userSessionTokens.set(userId, token);
    this.userSessionLogoutEpochs.set(userId, readLogoutEpoch(userId));
    this.clearedUsers.delete(userId);
    return token;
  }

  getUserSessionToken(userId: string) {
    if (!this.userSessionLogoutEpochs.has(userId)) {
      // Preserve the historical implicit session used by low-level callers.
      // Authenticated runtime code calls beginUserSession explicitly.
      this.userSessionLogoutEpochs.set(userId, readLogoutEpoch(userId));
    }
    return this.userSessionTokens.get(userId) ?? 0;
  }

  isUserSessionCurrent(userId: string, token: number) {
    const sessionLogoutEpoch = this.userSessionLogoutEpochs.get(userId);
    return (
      !this.clearedUsers.has(userId) &&
      this.getUserSessionToken(userId) === token &&
      sessionLogoutEpoch !== undefined &&
      sessionLogoutEpoch === readLogoutEpoch(userId)
    );
  }

  async waitForUserCleanup(userId: string, token: number) {
    while (this.isUserSessionCurrent(userId, token)) {
      const cleanup = readLogoutCleanup(userId);
      if (!cleanup) return true;
      const sessionEpoch = this.userSessionLogoutEpochs.get(userId);
      if (sessionEpoch === undefined || cleanup.epoch > sessionEpoch) {
        return false;
      }
      if (Date.now() - cleanup.startedAt >= LOGOUT_CLEANUP_STALE_MS) {
        // The tab that raised the barrier may have closed mid-cleanup. No
        // current-generation writer is allowed past this marker, so taking
        // over the idempotent deletion is safe.
        const takeover = beginLogoutCleanup(userId, cleanup.epoch);
        await this.deleteUserRecords(userId, takeover);
        finishLogoutCleanup(userId, takeover);
        continue;
      }
      await waitForCleanupPoll();
    }
    return false;
  }

  open() {
    if (!this.databasePromise) {
      this.databasePromise = openDB<DataSchema>(
        this.databaseName,
        DATABASE_VERSION,
        { upgrade: (db) => createSchema(db) },
      );
    }
    return this.databasePromise;
  }

  async clearUser(userId: string) {
    // Raise both barriers before awaiting IndexedDB. The shared epoch makes
    // callbacks owned by another Store/tab stale as soon as logout begins.
    const logoutEpoch = advanceLogoutEpoch(userId);
    const cleanup = beginLogoutCleanup(userId, logoutEpoch);
    this.userSessionTokens.set(userId, this.getUserSessionToken(userId) + 1);
    this.clearedUsers.add(userId);
    try {
      await this.deleteUserRecords(userId, cleanup);
    } finally {
      finishLogoutCleanup(userId, cleanup);
    }
  }

  private async deleteUserRecords(
    userId: string,
    expectedCleanup: LogoutCleanupMarker,
  ) {
    const db = await this.open();
    if (!sameCleanup(readLogoutCleanup(userId), expectedCleanup)) return;
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
