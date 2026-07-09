import { idbGet } from "../indexedDb";
import { updateOutboxItem } from "../syncQueue";
import type { OutboxItem } from "../types";
import { removeStoredFile } from "./storage";

export async function cleanupDeadOutboxOrphanedStorage(
  userId: string,
  id: string,
) {
  const item = await idbGet<OutboxItem>("outbox", id);
  if (
    !item ||
    item.userId !== userId ||
    item.status !== "dead" ||
    !item.orphanedStoragePath
  ) {
    return false;
  }

  const removed = await removeStoredFile(item.collection, item.orphanedStoragePath);
  if (removed === false) return false;

  const next = { ...item };
  delete next.orphanedStoragePath;
  await updateOutboxItem(next);
  return true;
}
