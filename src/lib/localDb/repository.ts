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

function getEntityClientId(entity: unknown) {
  if (entity && typeof entity === "object" && "client_id" in entity) {
    const clientId = (entity as { client_id?: unknown }).client_id;
    return typeof clientId === "string" && clientId ? clientId : null;
  }

  return null;
}

function preferEntity<T>(current: LocalEntity<T>, candidate: LocalEntity<T>) {
  const currentTransient = Boolean(current.pending || current.failed);
  const candidateTransient = Boolean(candidate.pending || candidate.failed);

  if (currentTransient !== candidateTransient) {
    return candidateTransient ? candidate : current;
  }

  return candidate.updatedAt > current.updatedAt ? candidate : current;
}

function toEntityData<T>(row: LocalEntity<T>) {
  return {
    ...(row.data as T),
    _local: {
      pending: row.pending,
      failed: row.failed,
      deleted: row.deleted,
    },
  };
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

  const withoutClientId: LocalEntity<T>[] = [];
  const byClientId = new Map<string, LocalEntity<T>>();

  rows
    .filter((row) => !row.deleted)
    .forEach((row) => {
      const clientId = getEntityClientId(row.data);

      if (!clientId) {
        withoutClientId.push(row);
        return;
      }

      const existing = byClientId.get(clientId);
      byClientId.set(clientId, existing ? preferEntity(existing, row) : row);
    });

  return [...withoutClientId, ...byClientId.values()].map(toEntityData);
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

export async function findEntitiesByClientId<T>(
  userId: string,
  collection: LocalCollection,
  clientId: string,
) {
  const rows = await idbGetAll<LocalEntity<T>>(
    "entities",
    "userCollection",
    IDBKeyRange.only([userId, collection]),
  );

  return rows.filter((row) => getEntityClientId(row.data) === clientId);
}

export async function removeEntitiesByClientId(
  userId: string,
  collection: LocalCollection,
  clientId: string,
  options?: { exceptEntityId?: string | number },
) {
  const exceptEntityId =
    typeof options?.exceptEntityId === "undefined" ? null : String(options.exceptEntityId);
  const rows = await findEntitiesByClientId(userId, collection, clientId);

  await Promise.all(
    rows
      .filter((row) => !exceptEntityId || row.entityId !== exceptEntityId)
      .map((row) => idbDelete("entities", row.key)),
  );
}

export async function upsertSyncedEntity<T>(
  userId: string,
  collection: LocalCollection,
  entity: T,
  options?: { localEntityId?: string | number },
) {
  const entityId = getEntityId(entity);
  const clientId = getEntityClientId(entity);
  const row = await upsertEntity(userId, collection, entity, {
    pending: false,
    failed: false,
    deleted: false,
  });

  if (clientId) {
    await removeEntitiesByClientId(userId, collection, clientId, {
      exceptEntityId: entityId,
    });
  }

  if (typeof options?.localEntityId !== "undefined" && String(options.localEntityId) !== entityId) {
    await removeEntity(userId, collection, options.localEntityId);
  }

  return row;
}

export async function cacheRemoteEntities<T extends { id: string | number }>(
  userId: string,
  collection: LocalCollection,
  entities: T[],
) {
  await Promise.all(
    entities.map(async (entity) => {
      const clientId = getEntityClientId(entity);
      const matching = clientId
        ? await findEntitiesByClientId(userId, collection, clientId)
        : [];

      if (matching.some((row) => row.pending || row.failed || row.deleted)) {
        return matching[0];
      }

      return upsertSyncedEntity(userId, collection, entity);
    }),
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
  const clientId = getEntityClientId(existing.data);
  const rowsToMark = clientId
    ? await findEntitiesByClientId(userId, collection, clientId)
    : [existing];

  await Promise.all(
    rowsToMark.map((row) =>
      idbPut("entities", {
        ...row,
        pending: true,
        deleted: true,
        updatedAt: new Date().toISOString(),
      }),
    ),
  );
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
