import { supabase } from "../supabaseClient";
import { readEntity, removeEntity, upsertEntity } from "./repository";
import { getOutboxItems, markOutboxItem, removeOutboxItem } from "./syncQueue";
import type { LocalCollection, OutboxItem, SyncStatus } from "./types";

const TRANSIENT_STATUS = new Set(["pending", "failed"]);

let currentStatus: SyncStatus = "idle";
const listeners = new Set<(status: SyncStatus) => void>();

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
  delete rest.local_file_name;
  return rest;
}

async function preparePayloadWithFileUpload(item: OutboxItem, payload: Record<string, unknown>) {
  const localFile = (item.payload as Record<string, unknown>)?.local_file;
  if (!(localFile instanceof Blob)) return payload;

  const fileName = String(
    (item.payload as Record<string, unknown>)?.local_file_name || `${item.entityId}.jpg`,
  );
  const extension = fileName.split(".").pop() || "jpg";
  const path =
    typeof payload.image_path === "string" && payload.image_path
      ? payload.image_path
      : `${item.userId}/${Date.now()}-${item.entityId}.${extension}`;

  const { error } = await supabase.storage
    .from(item.collection)
    .upload(path, localFile, { cacheControl: "3600", upsert: true });

  if (error) throw new Error(error.message);

  return {
    ...payload,
    image_path: path,
  };
}

function isDuplicateSuccess(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "23505" || Boolean(error?.message?.toLowerCase().includes("duplicate"));
}

async function applyOutboxItem(item: OutboxItem) {
  const table = supabase.from(item.collection as LocalCollection);
  const payload = await preparePayloadWithFileUpload(
    item,
    sanitizePayload(item.payload) as Record<string, unknown>,
  );
  const clientId =
    typeof payload.client_id === "string" && payload.client_id ? payload.client_id : null;

  if (item.operation === "delete") {
    const query = table.delete().eq("user_id", item.userId);
    const { error } = clientId
      ? await query.eq("client_id", clientId)
      : await query.eq("id", item.entityId);
    if (error) throw new Error(error.message);
    await removeEntity(item.userId, item.collection, item.entityId);
    return;
  }

  if (item.operation === "update") {
    const updates = { ...payload };
    delete updates.id;
    delete updates.user_id;
    const query = table.update(updates).eq("user_id", item.userId);
    const { error } = clientId
      ? await query.eq("client_id", clientId)
      : await query.eq("id", item.entityId);
    if (error) throw new Error(error.message);
  } else {
    const insertPayload = { ...payload };
    if (clientId) delete insertPayload.id;
    const { error } = await table.upsert(insertPayload, { onConflict: clientId ? "client_id" : "id" });
    if (error && !isDuplicateSuccess(error)) throw new Error(error.message);
  }

  const currentEntity = await readEntity(item.userId, item.collection, item.entityId);
  if (currentEntity) {
    await upsertEntity(item.userId, item.collection, { ...(currentEntity.data as object), ...payload }, {
      pending: false,
      failed: false,
      deleted: false,
    });
  }
}

export async function flushOutbox() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    setSyncStatus("idle");
    return;
  }

  const items = (await getOutboxItems([...TRANSIENT_STATUS] as Array<"pending" | "failed">))
    .filter((item) => item.userId === session.user.id);

  if (items.length === 0) {
    setSyncStatus("idle");
    return;
  }

  setSyncStatus("syncing");
  let failed = false;

  for (const item of items) {
    try {
      await markOutboxItem(item, "syncing");
      await applyOutboxItem(item);
      await removeOutboxItem(item.id);
    } catch (error) {
      failed = true;
      await markOutboxItem(
        item,
        "failed",
        error instanceof Error ? error.message : String(error),
      );

      const currentEntity = await readEntity(item.userId, item.collection, item.entityId);
      if (currentEntity) {
        await upsertEntity(item.userId, item.collection, currentEntity.data, {
          pending: false,
          failed: true,
          deleted: currentEntity.deleted,
        });
      }
    }
  }

  setSyncStatus(failed ? "failed" : "idle");
}

export function installSyncTriggers() {
  if (typeof window === "undefined") return () => undefined;

  const flush = () => {
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
