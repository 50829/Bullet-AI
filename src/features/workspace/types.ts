import type { SyncStatus } from "../../lib/localDb/types";

export type WorkspaceSessionState = {
  userId: string | null;
  syncStatus: SyncStatus;
  deadOutboxCount: number;
  retrySync: () => Promise<void>;
};
