import { idbDelete, idbGet, idbGetAll, idbPut } from "./indexedDb";
import type { LocalCollection, LocalEntity, LocalMeta } from "./types";

export function entityKey(userId: string, collection: LocalCollection, entityId: string | number) {
  return `${userId}:${collection}:${String(entityId)}`;
}

export function metaKey(userId: string, collection: LocalCollection) {
  return `${userId}:${collection}`;
}

export function createClientId(prefix = "entity") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getEntityId(entity: unknown) {
  if (entity && typeof entity === "object" && "id" in entity) {
    return String((entity as { id: string | number }).id);
  }

  if (entity && typeof entity === "object" && "client_id" in entity) {
    return String((entity as { client_id: string }).client_id);
  }

  throw new Error("Local entity must include an id or client_id");
}

export async function readEntities<T>(
  userId: string,
  collection: LocalCollection,
): Promise<Array<T & { _local?: Pick<LocalEntity, "pending" | "failed" | "deleted"> }>> {
  const rows = await idbGetAll<LocalEntity<T>>(
    "entities",
    "userCollection",
    IDBKeyRange.only([userId, collection]),
  );

  return rows
    .filter((row) => !row.deleted)
    .map((row) => ({
      ...(row.data as T),
      _local: {
        pending: row.pending,
        failed: row.failed,
        deleted: row.deleted,
      },
    }));
}

export async function readEntity<T>(
  userId: string,
  collection: LocalCollection,
  entityId: string | number,
): Promise<LocalEntity<T> | undefined> {
  return idbGet<LocalEntity<T>>("entities", entityKey(userId, collection, entityId));
}

export async function upsertEntity<T>(
  userId: string,
  collection: LocalCollection,
  entity: T,
  options?: { pending?: boolean; failed?: boolean; deleted?: boolean; skipPendingRemoteOverwrite?: boolean },
) {
  const entityId = getEntityId(entity);
  const key = entityKey(userId, collection, entityId);
  const existing = await idbGet<LocalEntity<T>>("entities", key);

  if (options?.skipPendingRemoteOverwrite && (existing?.pending || existing?.failed || existing?.deleted)) {
    return existing;
  }

  const now = new Date().toISOString();
  const row: LocalEntity<T> = {
    key,
    userId,
    collection,
    entityId,
    data: entity,
    updatedAt: now,
    pending: options?.pending ?? false,
    failed: options?.failed ?? false,
    deleted: options?.deleted ?? false,
  };

  await idbPut("entities", row);
  return row;
}

export async function cacheRemoteEntities<T extends { id: string | number }>(
  userId: string,
  collection: LocalCollection,
  entities: T[],
) {
  await Promise.all(
    entities.map((entity) =>
      upsertEntity(userId, collection, entity, {
        skipPendingRemoteOverwrite: true,
      }),
    ),
  );

  await setCollectionMeta(userId, collection, { lastFetchedAt: new Date().toISOString() });
}

export async function markEntityDeleted(
  userId: string,
  collection: LocalCollection,
  entityId: string | number,
) {
  const existing = await readEntity(userId, collection, entityId);
  if (!existing) return;

  await idbPut("entities", {
    ...existing,
    pending: true,
    deleted: true,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeEntity(
  userId: string,
  collection: LocalCollection,
  entityId: string | number,
) {
  await idbDelete("entities", entityKey(userId, collection, entityId));
}

export async function getCollectionMeta(
  userId: string,
  collection: LocalCollection,
): Promise<LocalMeta | undefined> {
  return idbGet<LocalMeta>("meta", metaKey(userId, collection));
}

export async function setCollectionMeta(
  userId: string,
  collection: LocalCollection,
  updates: Partial<LocalMeta>,
) {
  const key = metaKey(userId, collection);
  const current = await getCollectionMeta(userId, collection);
  await idbPut<LocalMeta>("meta", {
    key,
    userId,
    collection,
    lastFetchedAt: updates.lastFetchedAt ?? current?.lastFetchedAt ?? null,
    schemaVersion: updates.schemaVersion ?? current?.schemaVersion ?? 1,
  });
}
