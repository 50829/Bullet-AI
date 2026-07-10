import type {
  DataResource,
  MutationKind,
  MutationStatus,
} from "../../lib/data-v2";

export type SyncStatus = "idle" | "syncing" | "failed" | "offline";

export type SyncIssue = {
  id: string;
  resource: DataResource;
  operation: MutationKind;
  status: MutationStatus;
  error: string | null;
  attemptCount: number;
  updatedAt: string;
};

export type WorkspaceSessionState = {
  userId: string | null;
  ready: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  syncIssues: SyncIssue[];
  retrySync: () => Promise<void>;
  discardSyncItem: (id: string) => Promise<void>;
};
