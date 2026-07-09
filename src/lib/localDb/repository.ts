import {
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  idbRequest,
  runIdbTransaction,
} from "./indexedDb";
import { identityValueFor } from "./collectionSchemas";
import type {
  LocalFile,
  LocalCollection,
  LocalEntity,
  LocalMeta,
  OutboxItem,
  SyncOperation,
} from "./types";
import { stripTransientEntityFields } from "./payload";

type CollectionListener = () => void;
const collectionListeners = new Map<string, Set<CollectionListener>>();

function listenerKey(userId: string, collection: LocalCollection) {
  return `${userId}:${collection}`;
}

function emitCollectionChange(userId: string, collection: LocalCollection) {
  collectionListeners
    .get(listenerKey(userId, collection))
    ?.forEach((listener) => listener());
}

export function subscribeCollection(
  userId: string,
  collections: LocalCollection[],
  listener: CollectionListener,
) {
  const keys = collections.map((collection) => listenerKey(userId, collection));
  keys.forEach((key) => {
    const listeners =
      collectionListeners.get(key) ?? new Set<CollectionListener>();
    listeners.add(listener);
    collectionListeners.set(key, listeners);
  });

  return () => {
    keys.forEach((key) => {
      const listeners = collectionListeners.get(key);
      listeners?.delete(listener);
      if (listeners?.size === 0) collectionListeners.delete(key);
    });
  };
}

export function entityKey(
  userId: string,
  collection: LocalCollection,
  entityId: string | number,
) {
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

function getEntityId(collection: LocalCollection, entity: unknown) {
  if (!entity || typeof entity !== "object") {
    throw new Error("Local entity must be an object");
  }

  return identityValueFor(collection, entity as Record<string, unknown>);
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

export function localFileKey(
  userId: string,
  collection: LocalCollection,
  entityId: string | number,
) {
  return `${userId}:${collection}:${String(entityId)}`;
}

export function readLocalFile(fileId: string) {
  return idbGet<LocalFile>("files", fileId);
}

export async function removeLocalFile(fileId: string) {
  await idbDelete("files", fileId);
}

function createOutboxPayload(
  userId: string,
  collection: LocalCollection,
  entityId: string | number,
  payload: Record<string, unknown>,
) {
  const outboxPayload = { ...payload };
  const localFile = outboxPayload.local_file;
  const hasLocalFileField = Object.hasOwn(outboxPayload, "local_file");

  if (localFile instanceof Blob) {
    outboxPayload.local_file_id = localFileKey(userId, collection, entityId);
    delete outboxPayload.uploaded_image_path;
  } else if (hasLocalFileField) {
    outboxPayload.local_file_id = null;
    outboxPayload.uploaded_image_path = null;
  }

  delete outboxPayload.local_file;
  return outboxPayload;
}

export async function readEntities<T>(
  userId: string,
  collection: LocalCollection,
): Promise<
  Array<T & { _local?: Pick<LocalEntity, "pending" | "failed" | "deleted"> }>
> {
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
  const row = await idbGet<LocalEntity<T>>(
    "entities",
    entityKey(userId, collection, entityId),
  );
  if (row) return row;

  const rows = await idbGetAll<LocalEntity<T>>(
    "entities",
    "userCollection",
    IDBKeyRange.only([userId, collection]),
  );
  const target = String(entityId);
  return rows.find((candidate) => {
    const data = candidate.data as Record<string, unknown>;
    return (
      candidate.entityId === target ||
      data.client_id === target ||
      String(data.id ?? "") === target
    );
  });
}

export async function upsertEntity<T>(
  userId: string,
  collection: LocalCollection,
  entity: T,
  options?: {
    pending?: boolean;
    failed?: boolean;
    deleted?: boolean;
    skipPendingRemoteOverwrite?: boolean;
  },
) {
  const entityId = getEntityId(collection, entity);
  const key = entityKey(userId, collection, entityId);
  const existing = await idbGet<LocalEntity<T>>("entities", key);

  if (
    options?.skipPendingRemoteOverwrite &&
    (existing?.pending || existing?.failed || existing?.deleted)
  ) {
    return existing;
  }

  const now = new Date().toISOString();
  const row: LocalEntity<T> = {
    key,
    userId,
    collection,
    entityId,
    data: stripTransientEntityFields(entity),
    updatedAt: now,
    pending: options?.pending ?? false,
    failed: options?.failed ?? false,
    deleted: options?.deleted ?? false,
  };

  await idbPut("entities", row);
  emitCollectionChange(userId, collection);
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
    typeof options?.exceptEntityId === "undefined"
      ? null
      : String(options.exceptEntityId);
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
  options?: { localEntityId?: string | number; mutationUpdatedAt?: string },
) {
  const entityId = getEntityId(collection, entity);
  const clientId = getEntityClientId(entity);
  if (options?.mutationUpdatedAt) {
    const candidates = clientId
      ? await findEntitiesByClientId<T>(userId, collection, clientId)
      : typeof options.localEntityId !== "undefined"
        ? ([
            await readEntity<T>(userId, collection, options.localEntityId),
          ].filter(Boolean) as LocalEntity<T>[])
        : [];
    const newerPending = candidates.find(
      (candidate) =>
        candidate.pending && candidate.updatedAt > options.mutationUpdatedAt!,
    );
    if (newerPending) return newerPending;
  }
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

  if (
    typeof options?.localEntityId !== "undefined" &&
    String(options.localEntityId) !== entityId
  ) {
    await removeEntity(userId, collection, options.localEntityId);
  }

  return row;
}

export async function cacheRemoteEntities<
  T extends Record<string, unknown>,
>(
  userId: string,
  collection: LocalCollection,
  entities: T[],
  options?: { pruneMissing?: boolean },
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

  if (options?.pruneMissing !== false) {
    const remoteKeys = new Set(
      entities.map((entity) => {
        const clientId = getEntityClientId(entity);
        return clientId
          ? `client:${clientId}`
          : `id:${getEntityId(collection, entity)}`;
      }),
    );
    const localRows = await idbGetAll<LocalEntity<T>>(
      "entities",
      "userCollection",
      IDBKeyRange.only([userId, collection]),
    );

    await Promise.all(
      localRows
        .filter((row) => {
          if (row.pending || row.failed || row.deleted) return false;
          const clientId = getEntityClientId(row.data);
          const identity = clientId
            ? `client:${clientId}`
            : `id:${row.entityId}`;
          return !remoteKeys.has(identity);
        })
        .map((row) => idbDelete("entities", row.key)),
    );
  }

  await setCollectionMeta(userId, collection, {
    lastFetchedAt: new Date().toISOString(),
  });
  emitCollectionChange(userId, collection);
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
  emitCollectionChange(userId, collection);
}

export async function removeEntity(
  userId: string,
  collection: LocalCollection,
  entityId: string | number,
) {
  const existing = await readEntity(userId, collection, entityId);
  await idbDelete(
    "entities",
    existing?.key ?? entityKey(userId, collection, entityId),
  );
  emitCollectionChange(userId, collection);
}

function createMutationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function compactOperation(
  previous: SyncOperation | undefined,
  next: SyncOperation,
): SyncOperation {
  if (next === "delete") return "delete";
  if (previous === "upsert" || previous === "delete") return "upsert";
  return next;
}

export async function commitLocalMutation<
  T extends Record<string, unknown>,
>(input: {
  userId: string;
  collection: LocalCollection;
  entityId: string | number;
  payload: T;
  operation: SyncOperation;
  deleted?: boolean;
}) {
  const now = new Date().toISOString();
  const key = entityKey(input.userId, input.collection, input.entityId);
  const outboxPayload = createOutboxPayload(
    input.userId,
    input.collection,
    input.entityId,
    input.payload,
  );
  const localFile =
    input.payload.local_file instanceof Blob ? input.payload.local_file : null;
  const hasLocalFileField = Object.hasOwn(input.payload, "local_file");
  const fileId = localFileKey(input.userId, input.collection, input.entityId);

  await runIdbTransaction(
    ["entities", "outbox", "files"],
    "readwrite",
    async (stores) => {
      const existingEntity = await idbRequest<LocalEntity<T> | undefined>(
        stores.entities.get(key),
      );
      const entityRow: LocalEntity<T> = {
        key,
        userId: input.userId,
        collection: input.collection,
        entityId: String(input.entityId),
        data: stripTransientEntityFields(input.payload),
        updatedAt: now,
        pending: true,
        failed: false,
        deleted: input.deleted ?? input.operation === "delete",
      };

      if (existingEntity?.data && input.operation !== "delete") {
        entityRow.data = stripTransientEntityFields({
          ...existingEntity.data,
          ...input.payload,
        });
      }

      await idbRequest(stores.entities.put(entityRow));

      const index = stores.outbox.index("entity");
      const queued = await idbRequest<OutboxItem[]>(
        index.getAll(
          IDBKeyRange.only([
            input.userId,
            input.collection,
            String(input.entityId),
          ]),
        ),
      );
      const compactable = queued.filter((item) => item.status !== "syncing");
      const previous = compactable.at(-1);
      const operation = compactOperation(previous?.operation, input.operation);
      const payload =
        operation === "delete"
          ? outboxPayload
          : {
              ...((previous?.payload as Record<string, unknown>) ?? {}),
              ...outboxPayload,
            };

      await Promise.all(
        compactable.map((item) => idbRequest(stores.outbox.delete(item.id))),
      );
      if (localFile) {
        await idbRequest(
          stores.files.put({
            id: fileId,
            userId: input.userId,
            bucket: input.collection,
            path: "",
            blob: localFile,
            createdAt: now,
          } satisfies LocalFile),
        );
      } else if (input.operation === "delete" || hasLocalFileField) {
        await idbRequest(stores.files.delete(fileId));
      }
      const outboxItem: OutboxItem = {
        id: createMutationId(),
        userId: input.userId,
        collection: input.collection,
        entityId: String(input.entityId),
        operation,
        payload,
        status: "pending",
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        attemptCount: previous?.attemptCount ?? 0,
      };
      await idbRequest(stores.outbox.put(outboxItem));
    },
  );

  emitCollectionChange(input.userId, input.collection);
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
