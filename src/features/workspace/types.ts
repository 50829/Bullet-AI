import type {
  DeadOutboxDiagnostic,
  SyncStatus,
} from "../../lib/localDb/types";

export type WorkspaceSessionState = {
  userId: string | null;
  syncStatus: SyncStatus;
  deadOutboxCount: number;
  deadOutboxItems: DeadOutboxDiagnostic[];
  retrySync: () => Promise<void>;
  retryDeadOutboxItem: (id: string) => Promise<void>;
  discardDeadOutboxItem: (id: string) => Promise<void>;
  cleanupDeadOutboxOrphanedStorage: (id: string) => Promise<void>;
};
