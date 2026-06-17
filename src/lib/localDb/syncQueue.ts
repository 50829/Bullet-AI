import { idbDelete, idbGetAll, idbPut } from "./indexedDb";
import type { LocalCollection, OutboxItem, OutboxStatus, SyncOperation } from "./types";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function enqueueOutbox<T>(input: {
  userId: string;
  collection: LocalCollection;
  entityId: string | number;
  operation: SyncOperation;
  payload: T;
}) {
  const now = new Date().toISOString();
  const item: OutboxItem<T> = {
    id: createId(),
    userId: input.userId,
    collection: input.collection,
    entityId: String(input.entityId),
    operation: input.operation,
    payload: input.payload,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await idbPut("outbox", item);
  return item;
}

export async function getOutboxItems(statuses: OutboxStatus[] = ["pending", "failed"]) {
  const all = await idbGetAll<OutboxItem>("outbox");
  return all
    .filter((item) => statuses.includes(item.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateOutboxItem(item: OutboxItem) {
  await idbPut("outbox", {
    ...item,
    updatedAt: new Date().toISOString(),
  });
}

export async function markOutboxItem(
  item: OutboxItem,
  status: OutboxStatus,
  error?: string,
) {
  await updateOutboxItem({
    ...item,
    status,
    error,
  });
}

export async function removeOutboxItem(id: string) {
  await idbDelete("outbox", id);
}
