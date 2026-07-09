import { logger } from "../../observability/logger";
import { validateImageBlob } from "../../media/imageValidation";
import { supabase } from "../../supabaseClient";
import { storageBucketFor } from "../collectionSchemas";
import { readLocalFile, removeLocalFile } from "../repository";
import { updateOutboxItem } from "../syncQueue";
import type { LocalCollection, OutboxItem } from "../types";
import { SyncError } from "./errors";
import { getPreviousImagePath } from "./payload";

export async function resolveQueuedLocalFile(item: OutboxItem) {
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

export async function removeQueuedLocalFile(item: OutboxItem) {
  const fileId = (item.payload as Record<string, unknown>).local_file_id;
  if (typeof fileId === "string" && fileId) await removeLocalFile(fileId);
}

export async function preparePayloadWithFileUpload(
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

  const validation = validateImageBlob(localFile.blob);
  if (!validation.ok) throw new SyncError(validation.error, "permanent");

  const fileName = String(
    (item.payload as Record<string, unknown>)?.local_file_name ||
      `${item.entityId}.jpg`,
  );
  const extension = fileName.split(".").pop() || "jpg";
  const path =
    typeof payload.image_path === "string" && payload.image_path
      ? payload.image_path
      : `${item.userId}/${Date.now()}-${item.entityId}.${extension}`;

  const bucket = storageBucketFor(item.collection);
  if (!bucket) {
    throw new SyncError(
      `${item.collection} does not support file uploads`,
      "permanent",
    );
  }

  const { error } = await supabase.storage
    .from(bucket)
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

export async function removeStoredFile(
  collection: LocalCollection,
  imagePath: unknown,
) {
  const bucket = storageBucketFor(collection);
  if (!bucket || typeof imagePath !== "string" || !imagePath)
    return;

  const { error } = await supabase.storage.from(bucket).remove([imagePath]);
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

export async function removeReplacedStoredFile(
  item: OutboxItem,
  imagePath: unknown,
) {
  const previousImagePath = getPreviousImagePath(item);
  if (!previousImagePath || previousImagePath === imagePath) return;
  await removeStoredFile(item.collection, previousImagePath);
}
