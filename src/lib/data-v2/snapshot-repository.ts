import type { DataV2Notifier } from "./channel";
import { DataV2Database, dataEntityKey } from "./database";
import type {
  AnySnapshotRecord,
  DataResource,
  EntityByResource,
  SnapshotRecord,
} from "./types";

const SNAPSHOT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function collectionKey(userId: string, resource: DataResource) {
  return `${userId}:${resource}`;
}

function compareRemoteCursor(left: string, right: string) {
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) {
    throw new Error("Remote cursor is invalid");
  }
  const normalizedLeft = left.replace(/^0+(?=\d)/, "");
  const normalizedRight = right.replace(/^0+(?=\d)/, "");
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length ? 1 : -1;
  }
  if (normalizedLeft === normalizedRight) return 0;
  return normalizedLeft > normalizedRight ? 1 : -1;
}

function latestRemoteCursor(left?: string, right?: string) {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return compareRemoteCursor(left, right) >= 0 ? left : right;
}

export class SnapshotRepository {
  constructor(
    private readonly database: DataV2Database,
    private readonly now: () => string,
    private readonly notifier?: DataV2Notifier,
  ) {}

  async get<R extends DataResource>(
    userId: string,
    resource: R,
    clientId: string,
  ) {
    const db = await this.database.open();
    const transaction = db.transaction("snapshots", "readwrite");
    const store = transaction.objectStore("snapshots");
    const snapshot = await store.get(dataEntityKey(userId, resource, clientId));
    if (snapshot) {
      snapshot.lastAccessedAt = this.now();
      await store.put(snapshot);
    }
    await transaction.done;
    return snapshot as SnapshotRecord<R> | undefined;
  }

  async readCollection<R extends DataResource>(userId: string, resource: R) {
    const snapshots = await this.list(userId, resource, true);
    return snapshots.map((snapshot) => snapshot.entity);
  }

  async hasLoadedCollection(userId: string, resource: DataResource) {
    const db = await this.database.open();
    const transaction = db.transaction("collections", "readwrite");
    const store = transaction.objectStore("collections");
    const key = collectionKey(userId, resource);
    const collection = await store.get(key);
    if (collection) {
      await store.put({ ...collection, lastAccessedAt: this.now() });
    }
    await transaction.done;
    return Boolean(collection);
  }

  async getRemoteCursor(userId: string, resource: DataResource) {
    const db = await this.database.open();
    const collection = await db.get(
      "collections",
      collectionKey(userId, resource),
    );
    return collection?.remoteCursor ?? null;
  }

  async put<R extends DataResource>(
    resource: R,
    entity: EntityByResource[R],
    options?: { sessionToken?: number },
  ) {
    const sessionToken =
      options?.sessionToken ?? this.database.getUserSessionToken(entity.userId);
    if (!this.database.isUserSessionCurrent(entity.userId, sessionToken)) {
      return;
    }
    if (
      !(await this.database.waitForUserCleanup(entity.userId, sessionToken))
    ) {
      return;
    }
    const db = await this.database.open();
    if (!this.database.isUserSessionCurrent(entity.userId, sessionToken)) {
      return;
    }
    const now = this.now();
    await db.put("snapshots", {
      key: dataEntityKey(entity.userId, resource, entity.clientId),
      userId: entity.userId,
      resource,
      clientId: entity.clientId,
      entity,
      syncedAt: now,
      lastAccessedAt: now,
    } as AnySnapshotRecord);
    this.notifier?.publish({
      type: "snapshot-changed",
      userId: entity.userId,
      resource,
      clientId: entity.clientId,
    });
  }

  async replace<R extends DataResource>(
    userId: string,
    resource: R,
    entities: EntityByResource[R][],
    options?: {
      notify?: boolean;
      readStartedAt?: string;
      sessionToken?: number;
      remoteCursor?: string;
    },
  ) {
    if (entities.some((entity) => entity.userId !== userId)) {
      throw new Error("Remote snapshot contains an entity for another user");
    }
    if (
      options?.remoteCursor !== undefined &&
      !/^\d+$/.test(options.remoteCursor)
    ) {
      throw new Error("Remote cursor is invalid");
    }
    const sessionToken =
      options?.sessionToken ?? this.database.getUserSessionToken(userId);
    if (!this.database.isUserSessionCurrent(userId, sessionToken)) return;
    if (!(await this.database.waitForUserCleanup(userId, sessionToken))) return;
    const db = await this.database.open();
    if (!this.database.isUserSessionCurrent(userId, sessionToken)) return;
    const transaction = db.transaction(
      ["collections", "snapshots"],
      "readwrite",
    );
    const store = transaction.objectStore("snapshots");
    const collectionStore = transaction.objectStore("collections");
    const existingCollection = await collectionStore.get(
      collectionKey(userId, resource),
    );
    if (
      options?.remoteCursor !== undefined &&
      existingCollection?.remoteCursor !== undefined &&
      compareRemoteCursor(
        options.remoteCursor,
        existingCollection.remoteCursor,
      ) <= 0
    ) {
      await transaction.done;
      return;
    }
    const previous = await store
      .index("by-user-resource")
      .getAll([userId, resource]);
    const now = this.now();
    const remoteByClientId = new Map(
      entities.map((entity) => [entity.clientId, entity] as const),
    );
    const authoritativeBaseline = options?.remoteCursor !== undefined;
    const protectedSnapshots = authoritativeBaseline
      ? []
      : previous.filter((snapshot) => {
          const remote = remoteByClientId.get(snapshot.clientId);
          if (remote) return snapshot.entity.version > remote.version;
          return Boolean(
            options?.readStartedAt &&
            snapshot.syncedAt >= options.readStartedAt,
          );
        });
    const protectedIds = new Set(
      protectedSnapshots.map((snapshot) => snapshot.clientId),
    );
    const acceptedEntities = entities.filter(
      (entity) => !protectedIds.has(entity.clientId),
    );
    const remoteCursor = latestRemoteCursor(
      existingCollection?.remoteCursor,
      options?.remoteCursor,
    );
    await Promise.all([
      ...previous
        .filter((snapshot) => !protectedIds.has(snapshot.clientId))
        .map((snapshot) => store.delete(snapshot.key)),
      ...acceptedEntities.map((entity) =>
        store.put({
          key: dataEntityKey(userId, resource, entity.clientId),
          userId,
          resource,
          clientId: entity.clientId,
          entity,
          syncedAt: now,
          lastAccessedAt: now,
        } as AnySnapshotRecord),
      ),
      collectionStore.put({
        key: collectionKey(userId, resource),
        userId,
        resource,
        syncedAt: now,
        lastAccessedAt: now,
        ...(remoteCursor !== undefined ? { remoteCursor } : {}),
      }),
    ]);
    await transaction.done;

    if (options?.notify !== false) {
      const changedIds = new Set([
        ...previous.map((snapshot) => snapshot.clientId),
        ...entities.map((entity) => entity.clientId),
      ]);
      changedIds.forEach((clientId) =>
        this.notifier?.publish({
          type: "snapshot-changed",
          userId,
          resource,
          clientId,
        }),
      );
    }
  }

  async applyDelta<R extends DataResource>(
    userId: string,
    resource: R,
    input: {
      upserts: EntityByResource[R][];
      deletedClientIds: string[];
      resetClientIds?: string[];
      remoteCursor: string;
      sessionToken?: number;
      notify?: boolean;
    },
  ) {
    if (input.upserts.some((entity) => entity.userId !== userId)) {
      throw new Error("Remote delta contains an entity for another user");
    }
    if (!/^\d+$/.test(input.remoteCursor)) {
      throw new Error("Remote delta cursor is invalid");
    }
    const sessionToken =
      input.sessionToken ?? this.database.getUserSessionToken(userId);
    if (!this.database.isUserSessionCurrent(userId, sessionToken)) return;
    if (!(await this.database.waitForUserCleanup(userId, sessionToken))) return;
    const db = await this.database.open();
    if (!this.database.isUserSessionCurrent(userId, sessionToken)) return;

    const transaction = db.transaction(
      ["collections", "snapshots"],
      "readwrite",
    );
    const snapshots = transaction.objectStore("snapshots");
    const collectionStore = transaction.objectStore("collections");
    const existingCollection = await collectionStore.get(
      collectionKey(userId, resource),
    );
    if (
      existingCollection?.remoteCursor !== undefined &&
      compareRemoteCursor(
        input.remoteCursor,
        existingCollection.remoteCursor,
      ) <= 0
    ) {
      await transaction.done;
      return;
    }
    const now = this.now();
    const upsertsById = new Map(
      input.upserts.map((entity) => [entity.clientId, entity] as const),
    );
    const changedIds = new Set([
      ...input.deletedClientIds,
      ...upsertsById.keys(),
    ]);
    const resetClientIds = new Set(input.resetClientIds ?? []);

    for (const clientId of changedIds) {
      const key = dataEntityKey(userId, resource, clientId);
      const current = await snapshots.get(key);
      if (
        current &&
        !resetClientIds.has(clientId) &&
        upsertsById.has(clientId) &&
        current.entity.version > upsertsById.get(clientId)!.version
      ) {
        continue;
      }
      const remote = upsertsById.get(clientId);
      if (!remote) {
        await snapshots.delete(key);
        continue;
      }
      await snapshots.put({
        key,
        userId,
        resource,
        clientId,
        entity: remote,
        syncedAt: now,
        lastAccessedAt: now,
      } as AnySnapshotRecord);
    }

    await collectionStore.put({
      key: collectionKey(userId, resource),
      userId,
      resource,
      syncedAt: now,
      lastAccessedAt: now,
      remoteCursor: input.remoteCursor,
    });
    await transaction.done;

    if (input.notify !== false) {
      changedIds.forEach((clientId) =>
        this.notifier?.publish({
          type: "snapshot-changed",
          userId,
          resource,
          clientId,
        }),
      );
    }
  }

  async list<R extends DataResource>(
    userId: string,
    resource: R,
    touch: boolean,
  ) {
    const db = await this.database.open();
    if (!touch) {
      return (await db.getAllFromIndex("snapshots", "by-user-resource", [
        userId,
        resource,
      ])) as SnapshotRecord<R>[];
    }
    const transaction = db.transaction("snapshots", "readwrite");
    const store = transaction.objectStore("snapshots");
    const snapshots = await store
      .index("by-user-resource")
      .getAll([userId, resource]);
    if (snapshots.length > 0) {
      const now = this.now();
      await Promise.all(
        snapshots.map((snapshot) =>
          store.put({ ...snapshot, lastAccessedAt: now }),
        ),
      );
    }
    await transaction.done;
    return snapshots as SnapshotRecord<R>[];
  }

  async prune(
    userId: string,
    now = Date.now(),
    retentionMs = SNAPSHOT_RETENTION_MS,
  ) {
    const db = await this.database.open();
    const transaction = db.transaction(["snapshots", "mutations"], "readwrite");
    const [snapshots, mutations] = await Promise.all([
      transaction.objectStore("snapshots").index("by-user").getAll(userId),
      transaction.objectStore("mutations").index("by-user").getAll(userId),
    ]);
    const protectedKeys = new Set(
      mutations.map((mutation) =>
        dataEntityKey(mutation.userId, mutation.resource, mutation.clientId),
      ),
    );
    const expired = snapshots.filter(
      (snapshot) =>
        !protectedKeys.has(snapshot.key) &&
        now - new Date(snapshot.lastAccessedAt).getTime() >= retentionMs,
    );
    await Promise.all(
      expired.map((snapshot) =>
        transaction.objectStore("snapshots").delete(snapshot.key),
      ),
    );
    await transaction.done;
    return expired.length;
  }
}
