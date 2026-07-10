import type { DataNotifier } from "./channel";
import { DataDatabase } from "./database";
import { MutationMaintenanceRepository } from "./mutation-maintenance-repository";
import { MutationQueueRepository } from "./mutation-queue-repository";
import type { MutationRepositoryDependencies } from "./mutation-repository-internal";
import { MutationSyncRepository } from "./mutation-sync-repository";
import { applyPendingOverlay } from "./overlay";
import { SnapshotRepository } from "./snapshot-repository";
import type {
  AnyConflictRecord,
  AnyConflictDetails,
  AnyMutationRecord,
  DataResource,
  DataDiagnostics,
  ConflictResolution,
  ConflictResolutionResult,
  EnqueueMutationInput,
  EntityByResource,
  MutationBlobRecord,
  MutationBlockedReason,
  MutationRecord,
  OverlayRecord,
  SnapshotRecord,
} from "./types";

export interface DataStoreApi {
  getSnapshot<R extends DataResource>(
    userId: string,
    resource: R,
    clientId: string,
  ): Promise<SnapshotRecord<R> | undefined>;
  readCollection<R extends DataResource>(
    userId: string,
    resource: R,
  ): Promise<EntityByResource[R][]>;
  hasLoadedCollection(userId: string, resource: DataResource): Promise<boolean>;
  getRemoteCursor(
    userId: string,
    resource: DataResource,
  ): Promise<string | null>;
  readOverlayCollection<R extends DataResource>(
    userId: string,
    resource: R,
  ): Promise<OverlayRecord<R>[]>;
  putSnapshot<R extends DataResource>(
    resource: R,
    entity: EntityByResource[R],
    options?: { sessionToken?: number },
  ): Promise<void>;
  replaceSnapshots<R extends DataResource>(
    userId: string,
    resource: R,
    entities: EntityByResource[R][],
    options?: {
      notify?: boolean;
      readStartedAt?: string;
      sessionToken?: number;
      remoteCursor?: string;
    },
  ): Promise<void>;
  applyRemoteDelta<R extends DataResource>(
    userId: string,
    resource: R,
    input: {
      upserts: EntityByResource[R][];
      deletedClientIds: string[];
      resetClientIds?: string[];
      remoteCursor: string;
      sessionToken?: number;
      notify?: boolean;
    },
  ): Promise<void>;
  beginUserSession(userId: string): number;
  getUserSessionToken(userId: string): number;
  enqueueMutation<R extends DataResource>(
    input: EnqueueMutationInput<R>,
  ): Promise<MutationRecord<R> | null>;
  listRunnableMutations(
    userId: string,
    now: string,
  ): Promise<AnyMutationRecord[]>;
  claimMutation(mutationId: string): Promise<AnyMutationRecord | null>;
  getMutationBlobs(mutationId: string): Promise<MutationBlobRecord[]>;
  completeMutation(
    mutationId: string,
    remote: EntityByResource[DataResource] | null,
  ): Promise<void>;
  requeueTransient(
    mutationId: string,
    error: string,
    nextAttemptAt: string,
  ): Promise<void>;
  blockMutation(
    mutationId: string,
    reason: MutationBlockedReason,
    error: string,
  ): Promise<void>;
  recordConflict(
    mutationId: string,
    remote: EntityByResource[DataResource] | null,
    reason: string,
  ): Promise<void>;
  recoverSending(userId: string): Promise<number>;
  resumeAuthBlocked(userId: string): Promise<number>;
  getNextQueuedAt(userId: string): Promise<string | null>;
  listPendingMutations(userId: string): Promise<AnyMutationRecord[]>;
  listConflicts(userId: string): Promise<AnyConflictRecord[]>;
  listConflictDetails(userId: string): Promise<AnyConflictDetails[]>;
  getConflictDetails(id: string): Promise<AnyConflictDetails | null>;
  resolveConflict<R extends DataResource>(
    id: string,
    resolution: ConflictResolution<R>,
  ): Promise<ConflictResolutionResult | null>;
  getDiagnostics(userId: string): Promise<DataDiagnostics>;
  retryBlockedMutation(mutationId: string): Promise<boolean>;
  discardMutation(mutationId: string): Promise<boolean>;
  clearUser(userId: string): Promise<void>;
  pruneExpiredSnapshots(
    userId: string,
    now?: number,
    retentionMs?: number,
  ): Promise<number>;
  deleteDatabase(): Promise<void>;
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class DataStore implements DataStoreApi {
  private readonly database: DataDatabase;
  private readonly snapshots: SnapshotRepository;
  private readonly mutationQueue: MutationQueueRepository;
  private readonly mutationSync: MutationSyncRepository;
  private readonly mutationMaintenance: MutationMaintenanceRepository;

  constructor(
    options: {
      databaseName?: string;
      notifier?: DataNotifier;
      now?: () => Date;
      createId?: () => string;
    } = {},
  ) {
    const now = () => (options.now?.() ?? new Date()).toISOString();
    const createId = () => options.createId?.() ?? randomId();
    this.database = new DataDatabase(options.databaseName);
    this.snapshots = new SnapshotRepository(
      this.database,
      now,
      options.notifier,
    );
    const mutationDependencies: MutationRepositoryDependencies = {
      database: this.database,
      now,
      createId,
      notifier: options.notifier,
    };
    this.mutationQueue = new MutationQueueRepository(mutationDependencies);
    this.mutationSync = new MutationSyncRepository(mutationDependencies);
    this.mutationMaintenance = new MutationMaintenanceRepository(
      mutationDependencies,
    );
  }

  getSnapshot<R extends DataResource>(
    userId: string,
    resource: R,
    clientId: string,
  ) {
    return this.snapshots.get(userId, resource, clientId);
  }

  readCollection<R extends DataResource>(userId: string, resource: R) {
    return this.snapshots.readCollection(userId, resource);
  }

  hasLoadedCollection(userId: string, resource: DataResource) {
    return this.snapshots.hasLoadedCollection(userId, resource);
  }

  getRemoteCursor(userId: string, resource: DataResource) {
    return this.snapshots.getRemoteCursor(userId, resource);
  }

  async readOverlayCollection<R extends DataResource>(
    userId: string,
    resource: R,
  ) {
    const [snapshots, mutations] = await Promise.all([
      this.snapshots.list(userId, resource, true),
      this.mutationMaintenance.listForResource(userId, resource),
    ]);
    return applyPendingOverlay(snapshots, mutations);
  }

  putSnapshot<R extends DataResource>(
    resource: R,
    entity: EntityByResource[R],
    options?: { sessionToken?: number },
  ) {
    return this.snapshots.put(resource, entity, options);
  }

  replaceSnapshots<R extends DataResource>(
    userId: string,
    resource: R,
    entities: EntityByResource[R][],
    options?: {
      notify?: boolean;
      readStartedAt?: string;
      sessionToken?: number;
      remoteCursor?: string;
    },
  ) {
    return this.snapshots.replace(userId, resource, entities, options);
  }

  applyRemoteDelta<R extends DataResource>(
    userId: string,
    resource: R,
    input: {
      upserts: EntityByResource[R][];
      deletedClientIds: string[];
      resetClientIds?: string[];
      remoteCursor: string;
      sessionToken?: number;
      notify?: boolean;
    },
  ) {
    return this.snapshots.applyDelta(userId, resource, input);
  }

  enqueueMutation<R extends DataResource>(input: EnqueueMutationInput<R>) {
    return this.mutationQueue.enqueue(input);
  }

  listRunnableMutations(userId: string, now: string) {
    return this.mutationQueue.listRunnable(userId, now);
  }

  claimMutation(mutationId: string) {
    return this.mutationQueue.claim(mutationId);
  }

  getMutationBlobs(mutationId: string) {
    return this.mutationQueue.getBlobs(mutationId);
  }

  completeMutation(
    mutationId: string,
    remote: EntityByResource[DataResource] | null,
  ) {
    return this.mutationSync.complete(mutationId, remote);
  }

  requeueTransient(mutationId: string, error: string, nextAttemptAt: string) {
    return this.mutationSync.requeueTransient(mutationId, error, nextAttemptAt);
  }

  blockMutation(
    mutationId: string,
    reason: MutationBlockedReason,
    error: string,
  ) {
    return this.mutationSync.block(mutationId, reason, error);
  }

  recordConflict(
    mutationId: string,
    remote: EntityByResource[DataResource] | null,
    reason: string,
  ) {
    return this.mutationSync.recordConflict(mutationId, remote, reason);
  }

  recoverSending(userId: string) {
    return this.mutationSync.recoverSending(userId);
  }

  resumeAuthBlocked(userId: string) {
    return this.mutationSync.resumeAuthBlocked(userId);
  }

  getNextQueuedAt(userId: string) {
    return this.mutationQueue.getNextQueuedAt(userId);
  }

  listPendingMutations(userId: string) {
    return this.mutationMaintenance.listPending(userId);
  }

  listConflicts(userId: string) {
    return this.mutationMaintenance.listConflicts(userId);
  }

  listConflictDetails(userId: string) {
    return this.mutationMaintenance.listConflictDetails(userId);
  }

  getConflictDetails(id: string) {
    return this.mutationMaintenance.getConflictDetails(id);
  }

  resolveConflict<R extends DataResource>(
    id: string,
    resolution: ConflictResolution<R>,
  ) {
    return this.mutationMaintenance.resolveConflict(id, resolution);
  }

  getDiagnostics(userId: string) {
    return this.mutationMaintenance.getDiagnostics(userId);
  }

  retryBlockedMutation(mutationId: string) {
    return this.mutationMaintenance.retryBlocked(mutationId);
  }

  discardMutation(mutationId: string) {
    return this.mutationMaintenance.discard(mutationId);
  }

  clearUser(userId: string) {
    return this.database.clearUser(userId);
  }

  beginUserSession(userId: string) {
    return this.database.beginUserSession(userId);
  }

  getUserSessionToken(userId: string) {
    return this.database.getUserSessionToken(userId);
  }

  pruneExpiredSnapshots(userId: string, now?: number, retentionMs?: number) {
    return this.snapshots.prune(userId, now, retentionMs);
  }

  close() {
    return this.database.close();
  }

  deleteDatabase() {
    return this.database.delete();
  }
}
