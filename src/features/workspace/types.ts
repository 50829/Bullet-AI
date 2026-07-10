import type {
  AnyConflictDetails,
  ConflictResolution,
  DataResource,
  MutationKind,
  MutationStatus,
} from "@/data";

export type SyncStatus = "idle" | "syncing" | "failed" | "offline";

export type SyncIssue = {
  id: string;
  resource: DataResource;
  operation: MutationKind;
  status: MutationStatus;
  error: string | null;
  attemptCount: number;
  updatedAt: string;
  conflict: AnyConflictDetails | null;
};

export type WorkspaceSessionState = {
  userId: string | null;
  ready: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  syncIssues: SyncIssue[];
  retrySync: () => Promise<void>;
  retrySyncItem: (id: string) => Promise<void>;
  discardSyncItem: (id: string) => Promise<void>;
  getSyncConflictDetails: (id: string) => Promise<AnyConflictDetails | null>;
  resolveSyncConflict: <R extends DataResource>(
    id: string,
    resolution: ConflictResolution<R>,
  ) => Promise<void>;
};
