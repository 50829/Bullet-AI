import { logger } from "../../observability/logger";
import { supabase } from "../../supabaseClient";
import { readEntity, upsertEntity } from "../repository";
import {
  getOutboxItems,
  markOutboxItem,
  recoverStaleOutboxItems,
  removeOutboxItem,
} from "../syncQueue";
import { classifySyncError } from "./errors";
import { applyOutboxItem } from "./remoteWriter";
import { setSyncStatus } from "./status";

const SYNCABLE_OUTBOX_STATUSES: Array<"pending" | "failed"> = [
  "pending",
  "failed",
];

export async function performFlush() {
  await recoverStaleOutboxItems();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    setSyncStatus("idle");
    return;
  }

  const items = (await getOutboxItems(SYNCABLE_OUTBOX_STATUSES)).filter(
    (item) => item.userId === session.user.id,
  );

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
