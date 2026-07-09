import { idbDelete, idbGet, idbGetAll, idbPut } from "./indexedDb";
import { clearEntitySyncFailure } from "./repository";
import type {
  DeadOutboxDiagnostic,
  OutboxErrorKind,
  OutboxItem,
  OutboxStatus,
} from "./types";

export const MAX_OUTBOX_ATTEMPTS = 5;

const TERMINAL_ERROR_KINDS = new Set<OutboxErrorKind>([
  "permanent",
  "auth",
  "not_found",
]);

export async function getOutboxItems(
  statuses: OutboxStatus[] = ["pending", "failed"],
) {
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

export async function getDeadOutboxItems(userId: string) {
  const all = await idbGetAll<OutboxItem>("outbox");
  return all.filter((item) => item.userId === userId && item.status === "dead");
}

function toDeadOutboxDiagnostic(item: OutboxItem): DeadOutboxDiagnostic {
  return {
    id: item.id,
    collection: item.collection,
    entityId: item.entityId,
    operation: item.operation,
    error: item.error,
    errorKind: item.errorKind,
    attemptCount: item.attemptCount,
    deadAt: item.deadAt,
  };
}

export async function listDeadOutboxDiagnostics(userId: string) {
  const deadItems = await getDeadOutboxItems(userId);
  return deadItems
    .sort(
      (a, b) =>
        (b.deadAt ?? b.updatedAt).localeCompare(a.deadAt ?? a.updatedAt) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .map(toDeadOutboxDiagnostic);
}

export async function getDeadOutboxCount(userId: string) {
  return (await getDeadOutboxItems(userId)).length;
}

function requeueDeadOutboxItem(item: OutboxItem) {
  const next: OutboxItem = {
    ...item,
    status: "pending",
    attemptCount: 0,
    updatedAt: new Date().toISOString(),
  };
  delete next.error;
  delete next.errorKind;
  delete next.deadAt;
  delete next.orphanedStoragePath;
  return idbPut("outbox", next);
}

export async function updateOutboxItem(item: OutboxItem) {
  const next = {
    ...item,
    updatedAt: new Date().toISOString(),
  };
  await idbPut("outbox", next);
  return next;
}

export async function markOutboxItem(
  item: OutboxItem,
  status: OutboxStatus,
  errorOrOptions?:
    | string
    | {
        error?: string;
        errorKind?: OutboxErrorKind;
        maxAttempts?: number;
        orphanedStoragePath?: string | null;
      },
) {
  const current = (await idbGet<OutboxItem>("outbox", item.id)) ?? item;
  const options =
    typeof errorOrOptions === "string"
      ? { error: errorOrOptions }
      : (errorOrOptions ?? {});
  const attemptCount =
    status === "syncing"
      ? (current.attemptCount ?? 0) + 1
      : (current.attemptCount ?? 0);
  const maxAttempts = options.maxAttempts ?? MAX_OUTBOX_ATTEMPTS;
  const shouldDeadLetter =
    status === "dead" ||
    (status === "failed" &&
      (attemptCount >= maxAttempts ||
        (options.errorKind
          ? TERMINAL_ERROR_KINDS.has(options.errorKind)
          : false)));
  const nextStatus: OutboxStatus = shouldDeadLetter ? "dead" : status;
  const payload = current.payload as Record<string, unknown>;
  const orphanedStoragePath =
    options.orphanedStoragePath ??
    (nextStatus === "dead" && typeof payload.uploaded_image_path === "string"
      ? payload.uploaded_image_path
      : undefined);

  return updateOutboxItem({
    ...current,
    status,
    ...(nextStatus !== status ? { status: nextStatus } : {}),
    error: options.error,
    errorKind: options.errorKind,
    attemptCount,
    ...(nextStatus === "dead" ? { deadAt: new Date().toISOString() } : {}),
    ...(orphanedStoragePath ? { orphanedStoragePath } : {}),
  });
}

export async function retryDeadOutboxItems(userId: string) {
  const deadItems = await getDeadOutboxItems(userId);

  await Promise.all(deadItems.map(requeueDeadOutboxItem));

  return deadItems.length;
}

export async function retryDeadOutboxItem(userId: string, id: string) {
  const item = await idbGet<OutboxItem>("outbox", id);
  if (!item || item.userId !== userId || item.status !== "dead") return false;

  await requeueDeadOutboxItem(item);
  return true;
}

export async function discardDeadOutboxItem(userId: string, id: string) {
  const item = await idbGet<OutboxItem>("outbox", id);
  if (!item || item.userId !== userId || item.status !== "dead") return false;

  await clearEntitySyncFailure(userId, item.collection, item.entityId);
  await idbDelete("outbox", id);
  return true;
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
