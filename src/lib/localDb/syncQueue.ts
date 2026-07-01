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
  const priority = (item: OutboxItem) => {
    if (item.collection === "habits") return 0;
    if (item.collection === "habit_checkins") return 2;
    return 1;
  };
  return all
    .filter((item) => statuses.includes(item.status))
    .sort(
      (a, b) =>
        priority(a) - priority(b) || a.createdAt.localeCompare(b.createdAt),
    );
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
    attemptCount: status === "syncing" ? (item.attemptCount ?? 0) + 1 : item.attemptCount,
  });
}

export async function removeOutboxItem(id: string) {
  await idbDelete("outbox", id);
}

export async function recoverStaleOutboxItems(maxAgeMs = 2 * 60 * 1000) {
  const now = Date.now();
  const all = await idbGetAll<OutboxItem>("outbox");
  const stale = all.filter(
    (item) =>
      item.status === "syncing" &&
      now - new Date(item.updatedAt).getTime() >= maxAgeMs,
  );

  await Promise.all(
    stale.map((item) =>
      updateOutboxItem({
        ...item,
        status: "pending",
        error: "Recovered after an interrupted sync",
      }),
    ),
  );
  return stale.length;
}
