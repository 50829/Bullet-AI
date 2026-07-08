import { idbDelete, idbGet, idbGetAll, idbPut } from "./indexedDb";
import type { OutboxErrorKind, OutboxItem, OutboxStatus } from "./types";

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
