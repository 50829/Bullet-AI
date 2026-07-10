import type {
  DataResource,
  EntityByResource,
  VersionedEntity,
  WorkspaceEntity,
} from "../../domain/entities";

export type {
  DataResource,
  EntityByResource,
  VersionedEntity,
  WorkspaceEntity,
} from "../../domain/entities";

export type IsoTimestamp = string;

export type DataByResource = {
  [R in DataResource]: Omit<EntityByResource[R], keyof VersionedEntity>;
};

export type AnyDataEntity = WorkspaceEntity;

export type MutationKind = "create" | "patch" | "delete";
export type MutationStatus = "queued" | "sending" | "blocked" | "conflict";
export type MutationBlockedReason = "auth" | "permanent";
export type MutationCleanup = {
  momentImagePath?: string | null;
};

type MutationBase<R extends DataResource, K extends MutationKind> = {
  mutationId: string;
  userId: string;
  resource: R;
  clientId: string;
  kind: K;
  optimistic: EntityByResource[R];
  status: MutationStatus;
  attemptCount: number;
  nextAttemptAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  sendingStartedAt?: IsoTimestamp;
  blockedReason?: MutationBlockedReason;
  lastError?: string;
  dependsOnMutationId?: string;
  sessionToken?: number;
  cleanup?: MutationCleanup;
};

export type CreateMutationRecord<R extends DataResource = DataResource> =
  MutationBase<R, "create"> & {
    baseVersion: null;
    changes: DataByResource[R];
  };

export type PatchMutationRecord<R extends DataResource = DataResource> =
  MutationBase<R, "patch"> & {
    baseVersion: number;
    changes: Partial<DataByResource[R]>;
  };

export type DeleteMutationRecord<R extends DataResource = DataResource> =
  MutationBase<R, "delete"> & {
    baseVersion: number;
    changes: null;
  };

export type MutationRecord<R extends DataResource = DataResource> =
  CreateMutationRecord<R> | PatchMutationRecord<R> | DeleteMutationRecord<R>;

export type AnyMutationRecord = {
  [R in DataResource]: MutationRecord<R>;
}[DataResource];

export type MutationBlobInput = {
  slot: string;
  blob: Blob;
  fileName: string;
};

export type MutationBlobRecord = {
  blobId: string;
  mutationId: string;
  userId: string;
  slot: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  createdAt: IsoTimestamp;
};

type EnqueueBase<R extends DataResource, K extends MutationKind> = {
  userId: string;
  resource: R;
  clientId: string;
  kind: K;
  optimistic: EntityByResource[R];
  blobs?: MutationBlobInput[];
  cleanup?: MutationCleanup;
};

export type EnqueueCreateMutation<R extends DataResource> = EnqueueBase<
  R,
  "create"
> & {
  baseVersion: null;
  changes: DataByResource[R];
};

export type EnqueuePatchMutation<R extends DataResource> = EnqueueBase<
  R,
  "patch"
> & {
  baseVersion: number;
  changes: Partial<DataByResource[R]>;
};

export type EnqueueDeleteMutation<R extends DataResource> = EnqueueBase<
  R,
  "delete"
> & {
  baseVersion: number;
  changes?: null;
};

export type EnqueueMutationInput<R extends DataResource> =
  EnqueueCreateMutation<R> | EnqueuePatchMutation<R> | EnqueueDeleteMutation<R>;

export type SnapshotRecord<R extends DataResource = DataResource> = {
  key: string;
  userId: string;
  resource: R;
  clientId: string;
  entity: EntityByResource[R];
  syncedAt: IsoTimestamp;
  lastAccessedAt: IsoTimestamp;
  lastMutationId?: string;
};

export type AnySnapshotRecord = {
  [R in DataResource]: SnapshotRecord<R>;
}[DataResource];

export type ConflictRecord<R extends DataResource = DataResource> = {
  conflictId: string;
  mutationId: string;
  userId: string;
  resource: R;
  clientId: string;
  baseVersion: number | null;
  local: EntityByResource[R];
  remote: EntityByResource[R] | null;
  reason: string;
  createdAt: IsoTimestamp;
};

export type AnyConflictRecord = {
  [R in DataResource]: ConflictRecord<R>;
}[DataResource];

export type OverlayRecord<R extends DataResource> = {
  entity: EntityByResource[R];
  sync: {
    mutationId: string | null;
    status: MutationStatus | "synced";
    error: string | null;
  };
};

export type RemoteMutationRequest<R extends DataResource = DataResource> = {
  mutationId: string;
  userId: string;
  resource: R;
  clientId: string;
  kind: MutationKind;
  baseVersion: number | null;
  changes: DataByResource[R] | Partial<DataByResource[R]> | null;
  optimistic: EntityByResource[R];
  blobs: MutationBlobRecord[];
  cleanup?: MutationCleanup;
};

export type RemoteMutationResult<R extends DataResource = DataResource> =
  | { kind: "applied"; entity: EntityByResource[R] | null }
  | {
      kind: "conflict";
      remote: EntityByResource[R] | null;
      reason: string;
    }
  | { kind: "auth"; error: string }
  | { kind: "transient"; error: string; retryAfterMs?: number }
  | { kind: "permanent"; error: string };

export interface RemoteMutationExecutor {
  execute<R extends DataResource>(
    request: RemoteMutationRequest<R>,
    signal: AbortSignal,
  ): Promise<RemoteMutationResult<R>>;
}

export type DataV2Diagnostics = {
  queued: number;
  sending: number;
  blocked: number;
  conflicts: number;
  mutations: AnyMutationRecord[];
};
