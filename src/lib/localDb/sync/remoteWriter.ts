import { supabase } from "../../supabaseClient";
import {
  conflictTargetFor,
  identityColumnFor,
  selectColumnsFor,
  usesSoftDelete,
} from "../collectionSchemas";
import {
  readEntity,
  removeEntitiesByClientId,
  removeEntity,
  upsertSyncedEntity,
} from "../repository";
import type { LocalCollection, OutboxItem } from "../types";
import { SyncError } from "./errors";
import { getClientId, isDuplicateSuccess, sanitizePayload } from "./payload";
import {
  preparePayloadWithFileUpload,
  removeQueuedLocalFile,
  removeReplacedStoredFile,
  removeStoredFile,
} from "./storage";

type RemoteMutationResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

type RemoteMutationQuery = {
  eq: (column: string, value: string | number) => RemoteMutationQuery;
  select: (columns: string) => RemoteMutationQuery;
  maybeSingle: () => Promise<RemoteMutationResult>;
};

type RemoteMutationTable = {
  update: (payload: Record<string, unknown>) => RemoteMutationQuery;
  upsert: (
    payload: Record<string, unknown>,
    options: { onConflict: string },
  ) => RemoteMutationQuery;
};

function getIdentityValue(
  collection: LocalCollection,
  item: OutboxItem,
  payload: Record<string, unknown>,
) {
  const identityColumn = identityColumnFor(collection);
  const value =
    identityColumn === "user_id" ? item.userId : payload[identityColumn];

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return item.entityId;
}

function applyIdentityFilter(
  query: RemoteMutationQuery,
  collection: LocalCollection,
  item: OutboxItem,
  payload: Record<string, unknown>,
): RemoteMutationQuery {
  const identityColumn = identityColumnFor(collection);
  if (identityColumn === "user_id") return query;
  return query.eq(identityColumn, getIdentityValue(collection, item, payload));
}

export async function applyOutboxItem(item: OutboxItem) {
  const table = supabase.from(
    item.collection as LocalCollection,
  ) as unknown as RemoteMutationTable;
  const payload = await preparePayloadWithFileUpload(
    item,
    sanitizePayload(item.payload) as Record<string, unknown>,
  );
  const clientId = getClientId(payload);

  if (item.operation === "delete") {
    if (!usesSoftDelete(item.collection)) {
      throw new SyncError(
        `${item.collection} does not support local-first delete`,
        "permanent",
      );
    }

    const deletedAt =
      typeof payload.deleted_at === "string"
        ? payload.deleted_at
        : new Date().toISOString();
    const query = table
      .update({ deleted_at: deletedAt })
      .eq("user_id", item.userId);
    const deleteQuery = applyIdentityFilter(
      query,
      item.collection,
      item,
      payload,
    );
    const { data, error } = await deleteQuery.select("id").maybeSingle();
    if (error) throw new SyncError(error.message, "transient");
    if (!data)
      throw new SyncError("Remote row not found for delete", "not_found");
    await removeStoredFile(item.collection, payload.image_path);
    await removeQueuedLocalFile(item);
    if (clientId) {
      await removeEntitiesByClientId(item.userId, item.collection, clientId);
    } else {
      await removeEntity(item.userId, item.collection, item.entityId);
    }
    return;
  }

  if (item.operation === "update") {
    const updates = { ...payload };
    delete updates.id;
    delete updates.user_id;
    const query = table.update(updates).eq("user_id", item.userId);
    const updateQuery = applyIdentityFilter(
      query,
      item.collection,
      item,
      payload,
    );
    const { data, error } = await updateQuery
      .select(selectColumnsFor(item.collection))
      .maybeSingle();
    if (error)
      throw new SyncError(
        error.message,
        "transient",
        typeof payload.image_path === "string" ? payload.image_path : undefined,
      );
    if (!data)
      throw new SyncError(
        "Remote row not found for update",
        "not_found",
        typeof payload.image_path === "string" ? payload.image_path : undefined,
      );
    const syncedData = data as unknown as Record<string, unknown>;
    await removeReplacedStoredFile(item, syncedData.image_path);
    await upsertSyncedEntity(item.userId, item.collection, syncedData, {
      localEntityId: item.entityId,
      mutationUpdatedAt: item.updatedAt,
    });
    await removeQueuedLocalFile(item);
    return;
  }

  const insertPayload = { ...payload };
  if (clientId) delete insertPayload.id;
  const { data, error } = await table
    .upsert(insertPayload, { onConflict: conflictTargetFor(item.collection) })
    .select(selectColumnsFor(item.collection))
    .maybeSingle();
  if (error && !isDuplicateSuccess(error))
    throw new SyncError(
      error.message,
      "transient",
      typeof payload.image_path === "string" ? payload.image_path : undefined,
    );
  if (data) {
    const syncedData = data as unknown as Record<string, unknown>;
    await removeReplacedStoredFile(item, syncedData.image_path);
    await upsertSyncedEntity(item.userId, item.collection, syncedData, {
      localEntityId: item.entityId,
      mutationUpdatedAt: item.updatedAt,
    });
    await removeQueuedLocalFile(item);
    return;
  }

  const currentEntity = await readEntity(
    item.userId,
    item.collection,
    item.entityId,
  );
  if (currentEntity) {
    await upsertSyncedEntity(item.userId, item.collection, payload, {
      localEntityId: item.entityId,
      mutationUpdatedAt: item.updatedAt,
    });
    await removeQueuedLocalFile(item);
  }
}
