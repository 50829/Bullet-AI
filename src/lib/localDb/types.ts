export type LocalCollection =
  | "moments"
  | "reflections"
  | "goals"
  | "habits"
  | "habit_checkins"
  | "profiles";

export type SyncOperation = "upsert" | "update" | "delete";
export type SyncStatus = "idle" | "syncing" | "failed";
export type SyncState = "synced" | "pending" | "failed";
export type OutboxStatus = "pending" | "syncing" | "failed" | "dead";
export type OutboxErrorKind =
  "transient" | "permanent" | "auth" | "not_found" | "storage";

export type LocalEntityBase = {
  id?: number;
  client_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  sync_state?: SyncState;
};

export type LocalEntity<T = unknown> = {
  key: string;
  userId: string;
  collection: LocalCollection;
  entityId: string;
  data: T;
  updatedAt: string;
  pending?: boolean;
  failed?: boolean;
  deleted?: boolean;
};

export type OutboxItem<T = unknown> = {
  id: string;
  userId: string;
  collection: LocalCollection;
  entityId: string;
  operation: SyncOperation;
  payload: T;
  status: OutboxStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  errorKind?: OutboxErrorKind;
  attemptCount?: number;
  deadAt?: string;
  orphanedStoragePath?: string;
};

export type LocalFile = {
  id: string;
  userId: string;
  bucket: string;
  path: string;
  blob: Blob;
  createdAt: string;
};

export type LocalMeta = {
  key: string;
  userId: string;
  collection: LocalCollection;
  lastFetchedAt: string | null;
  schemaVersion: number;
};
