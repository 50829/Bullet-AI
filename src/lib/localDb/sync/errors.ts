import type { OutboxErrorKind } from "../types";

export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: OutboxErrorKind = "transient",
    readonly orphanedStoragePath?: string,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

export function classifySyncError(error: unknown) {
  if (error instanceof SyncError) return error;
  return new SyncError(
    error instanceof Error ? error.message : String(error),
    "transient",
  );
}
