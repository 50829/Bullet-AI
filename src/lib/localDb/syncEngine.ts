import { supabase } from "../supabaseClient";
import {
  readEntity,
  readLocalFile,
  removeEntitiesByClientId,
  removeEntity,
  removeLocalFile,
  upsertEntity,
  upsertSyncedEntity,
} from "./repository";
import {
  getOutboxItems,
  markOutboxItem,
  recoverStaleOutboxItems,
  removeOutboxItem,
  updateOutboxItem,
} from "./syncQueue";
import { logger } from "../observability/logger";
import type {
  LocalCollection,
  OutboxErrorKind,
  OutboxItem,
  SyncStatus,
} from "./types";

const TRANSIENT_STATUS = new Set(["pending", "failed"]);
const STORAGE_COLLECTIONS = new Set<LocalCollection>([
  "moments",
  "reflections",
  "goals",
  "habits",
]);
const REMOTE_SYNC_SELECT: Record<LocalCollection, string> = {
  moments:
    "id,client_id,user_id,content,image_path,created_at,updated_at,deleted_at",
  reflections:
    "id,client_id,user_id,content,title,body,source,source_type,location,image_path,created_at,updated_at,deleted_at",
  goals:
    "id,client_id,user_id,title,description,status,due_date,progress,color,sort_order,image_path,created_at,updated_at,deleted_at",
  habits:
    "id,client_id,user_id,name,description,frequency,color,created_at,updated_at,deleted_at",
  habit_checkins:
    "id,client_id,user_id,habit_id,habit_client_id,checked_on,checked,created_at,updated_at,deleted_at",
  profiles:
    "user_id,username,username_updated_at,updated_at,preferences_updated_at,preferred_language,ui_theme,accent_color,color_scheme,completed_goal_retention,week_starts_on",
};

let currentStatus: SyncStatus = "idle";
let activeFlush: Promise<void> | null = null;
const listeners = new Set<(status: SyncStatus) => void>();

class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: OutboxErrorKind = "transient",
    readonly orphanedStoragePath?: string,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

export function getSyncStatus() {
  return currentStatus;
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void) {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

function setSyncStatus(status: SyncStatus) {
  currentStatus = status;
  listeners.forEach((listener) => listener(status));
}

function sanitizePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;

  const rest = { ...(payload as Record<string, unknown>) };
  delete rest._local;
  delete rest.date;
  delete rest.image_url;
  delete rest.local_file;
  delete rest.local_file_id;
  delete rest.local_file_name;
  delete rest.uploaded_image_path;
  delete rest.previous_image_path;
  return rest;
}

function getPreviousImagePath(item: OutboxItem) {
  const value = (item.payload as Record<string, unknown>)?.previous_image_path;
  return typeof value === "string" && value ? value : null;
}

async function preparePayloadWithFileUpload(
  item: OutboxItem,
  payload: Record<string, unknown>,
) {
  const uploadedImagePath = (item.payload as Record<string, unknown>)
    .uploaded_image_path;
  if (typeof uploadedImagePath === "string" && uploadedImagePath) {
    return {
      ...payload,
      image_path: uploadedImagePath,
    };
  }

  const localFile = await resolveQueuedLocalFile(item);
  if (!localFile) return payload;

  const fileName = String(
    (item.payload as Record<string, unknown>)?.local_file_name ||
      `${item.entityId}.jpg`,
  );
  const extension = fileName.split(".").pop() || "jpg";
  const path =
    typeof payload.image_path === "string" && payload.image_path
      ? payload.image_path
      : `${item.userId}/${Date.now()}-${item.entityId}.${extension}`;

  const { error } = await supabase.storage
    .from(item.collection)
    .upload(path, localFile.blob, { cacheControl: "3600", upsert: true });

  if (error) throw new SyncError(error.message, "storage");

  await updateOutboxItem({
    ...item,
    payload: {
      ...(item.payload as Record<string, unknown>),
      image_path: path,
      uploaded_image_path: path,
    },
  });

  return {
    ...payload,
    image_path: path,
  };
}

async function resolveQueuedLocalFile(item: OutboxItem) {
  const payload = item.payload as Record<string, unknown>;
  if (payload.local_file instanceof Blob) {
    return { blob: payload.local_file, fileId: null };
  }

  const fileId = payload.local_file_id;
  if (typeof fileId !== "string" || !fileId) return null;

  const stored = await readLocalFile(fileId);
  if (!stored) throw new SyncError("Queued local file not found", "permanent");
  return { blob: stored.blob, fileId };
}

async function removeQueuedLocalFile(item: OutboxItem) {
  const fileId = (item.payload as Record<string, unknown>).local_file_id;
  if (typeof fileId === "string" && fileId) await removeLocalFile(fileId);
}

function isDuplicateSuccess(
  error: { code?: string; message?: string } | null | undefined,
) {
  return (
    error?.code === "23505" ||
    Boolean(error?.message?.toLowerCase().includes("duplicate"))
  );
}

function selectColumnsFor(collection: LocalCollection) {
  return REMOTE_SYNC_SELECT[collection];
}

async function removeStoredFile(
  collection: LocalCollection,
  imagePath: unknown,
) {
  if (
    !STORAGE_COLLECTIONS.has(collection) ||
    typeof imagePath !== "string" ||
    !imagePath
  )
    return;

  const { error } = await supabase.storage.from(collection).remove([imagePath]);
  if (error) {
    logger.warn("storage_cleanup_failed", {
      collection,
      imagePath,
      error,
    });
    return false;
  }
  return true;
}

async function removeReplacedStoredFile(item: OutboxItem, imagePath: unknown) {
  const previousImagePath = getPreviousImagePath(item);
  if (!previousImagePath || previousImagePath === imagePath) return;
  await removeStoredFile(item.collection, previousImagePath);
}

async function applyOutboxItem(item: OutboxItem) {
  const table = supabase.from(item.collection as LocalCollection);
  const payload = await preparePayloadWithFileUpload(
    item,
    sanitizePayload(item.payload) as Record<string, unknown>,
  );
  const clientId =
    typeof payload.client_id === "string" && payload.client_id
      ? payload.client_id
      : null;

  if (item.operation === "delete") {
    const deletedAt =
      typeof payload.deleted_at === "string"
        ? payload.deleted_at
        : new Date().toISOString();
    const query = table
      .update({ deleted_at: deletedAt })
      .eq("user_id", item.userId);
    const { data, error } = clientId
      ? await query.eq("client_id", clientId).select("id").maybeSingle()
      : await query.eq("id", item.entityId).select("id").maybeSingle();
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
    const { data, error } = clientId
      ? await query
          .eq("client_id", clientId)
          .select(selectColumnsFor(item.collection))
          .maybeSingle()
      : await query
          .eq("id", item.entityId)
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
  } else {
    const insertPayload = { ...payload };
    if (clientId) delete insertPayload.id;
    const { data, error } = await table
      .upsert(insertPayload, { onConflict: clientId ? "client_id" : "id" })
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

function classifySyncError(error: unknown) {
  if (error instanceof SyncError) return error;
  return new SyncError(
    error instanceof Error ? error.message : String(error),
    "transient",
  );
}

async function performFlush() {
  await recoverStaleOutboxItems();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    setSyncStatus("idle");
    return;
  }

  const items = (
    await getOutboxItems([...TRANSIENT_STATUS] as Array<"pending" | "failed">)
  ).filter((item) => item.userId === session.user.id);

  if (items.length === 0) {
    setSyncStatus("idle");
    return;
  }

  setSyncStatus("syncing");
  let failed = false;

  for (const item of items) {
    let activeItem = item;
    const startedAt = Date.now();
    try {
      activeItem = await markOutboxItem(item, "syncing");
      await applyOutboxItem(activeItem);
      await removeOutboxItem(activeItem.id);
      logger.info("outbox_item_synced", {
        collection: activeItem.collection,
        entityId: activeItem.entityId,
        operation: activeItem.operation,
        attemptCount: activeItem.attemptCount,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const syncError = classifySyncError(error);
      failed = true;
      const failedItem = await markOutboxItem(activeItem, "failed", {
        error: syncError.message,
        errorKind: syncError.kind,
        orphanedStoragePath: syncError.orphanedStoragePath,
      });
      logger.warn("outbox_item_failed", {
        collection: failedItem.collection,
        entityId: failedItem.entityId,
        operation: failedItem.operation,
        status: failedItem.status,
        errorKind: failedItem.errorKind,
        attemptCount: failedItem.attemptCount,
        orphanedStoragePath: failedItem.orphanedStoragePath,
        durationMs: Date.now() - startedAt,
      });

      const currentEntity = await readEntity(
        activeItem.userId,
        activeItem.collection,
        activeItem.entityId,
      );
      if (currentEntity && currentEntity.updatedAt <= activeItem.updatedAt) {
        await upsertEntity(
          activeItem.userId,
          activeItem.collection,
          currentEntity.data,
          {
            pending: false,
            failed: true,
            deleted: currentEntity.deleted,
          },
        );
      }
    }
  }

  setSyncStatus(failed ? "failed" : "idle");
}

async function flushWithCrossTabLock() {
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(
      "bullet-ai-outbox",
      { ifAvailable: true },
      async (lock) => {
        if (lock) await performFlush();
      },
    );
    return;
  }

  await performFlush();
}

export function flushOutbox() {
  if (activeFlush) return activeFlush;
  activeFlush = flushWithCrossTabLock().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

export function installSyncTriggers() {
  if (typeof window === "undefined") return () => undefined;

  const flush = () => {
    if (document.visibilityState === "visible" || navigator.onLine)
      void flushOutbox();
  };

  window.addEventListener("online", flush);
  window.addEventListener("visibilitychange", flush);
  const interval = window.setInterval(flush, 30_000);
  flush();

  return () => {
    window.removeEventListener("online", flush);
    window.removeEventListener("visibilitychange", flush);
    window.clearInterval(interval);
  };
}
