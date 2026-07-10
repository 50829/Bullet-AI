import {
  collectMutationTree,
  notifyMutation,
  type MutationRepositoryDependencies,
} from "./mutation-repository-internal";
import { dataEntityKey } from "./database";
import type {
  AnyConflictDetails,
  AnyConflictRecord,
  AnyMutationRecord,
  AnySnapshotRecord,
  ConflictResolution,
  ConflictResolutionResult,
  DataByResource,
  DataResource,
  DataV2Diagnostics,
  EntityByResource,
  MutationRecord,
} from "./types";

function businessData<R extends DataResource>(entity: EntityByResource[R]) {
  const record: Record<string, unknown> = { ...entity };
  delete record.clientId;
  delete record.userId;
  delete record.version;
  delete record.createdAt;
  delete record.updatedAt;
  delete record.sync;
  return record as DataByResource[R];
}

function latestRemote(
  conflict: AnyConflictRecord,
  snapshot: EntityByResource[DataResource] | null,
) {
  if (!snapshot) return conflict.remote;
  if (!conflict.remote || snapshot.version > conflict.remote.version) {
    return snapshot;
  }
  return conflict.remote;
}

function conflictDetails(
  conflict: AnyConflictRecord,
  mutation: AnyMutationRecord,
  snapshot: EntityByResource[DataResource] | null,
  blobs: AnyConflictDetails["blobs"],
): AnyConflictDetails {
  return {
    ...conflict,
    kind: conflict.kind ?? mutation.kind,
    changes:
      "changes" in conflict ? conflict.changes : (mutation.changes ?? null),
    remote: latestRemote(conflict, snapshot),
    mutation,
    blobs,
  } as AnyConflictDetails;
}

export class MutationMaintenanceRepository {
  constructor(private readonly dependencies: MutationRepositoryDependencies) {}

  async listConflicts(userId: string) {
    const db = await this.dependencies.database.open();
    return db.getAllFromIndex("conflicts", "by-user", userId);
  }

  async listConflictDetails(userId: string) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction(
      ["snapshots", "mutations", "blobs", "conflicts"],
      "readonly",
    );
    const conflicts = await transaction
      .objectStore("conflicts")
      .index("by-user")
      .getAll(userId);
    const latestByMutation = new Map<string, AnyConflictRecord>();
    conflicts
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .forEach((conflict) =>
        latestByMutation.set(conflict.mutationId, conflict),
      );
    const details = await Promise.all(
      [...latestByMutation.values()].map(async (conflict) => {
        const [mutation, snapshot, blobs] = await Promise.all([
          transaction.objectStore("mutations").get(conflict.mutationId),
          transaction
            .objectStore("snapshots")
            .get(dataEntityKey(userId, conflict.resource, conflict.clientId)),
          transaction
            .objectStore("blobs")
            .index("by-mutation")
            .getAll(conflict.mutationId),
        ]);
        return mutation
          ? conflictDetails(conflict, mutation, snapshot?.entity ?? null, blobs)
          : null;
      }),
    );
    await transaction.done;
    return details.filter(
      (detail): detail is AnyConflictDetails => detail !== null,
    );
  }

  async getConflictDetails(id: string) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction(
      ["snapshots", "mutations", "blobs", "conflicts"],
      "readonly",
    );
    const conflictStore = transaction.objectStore("conflicts");
    const direct = await conflictStore.get(id);
    const conflict =
      direct ??
      (await conflictStore.index("by-mutation").getAll(id)).sort(
        (left, right) => right.createdAt.localeCompare(left.createdAt),
      )[0];
    if (!conflict) {
      await transaction.done;
      return null;
    }
    const [mutation, snapshot, blobs] = await Promise.all([
      transaction.objectStore("mutations").get(conflict.mutationId),
      transaction
        .objectStore("snapshots")
        .get(
          dataEntityKey(conflict.userId, conflict.resource, conflict.clientId),
        ),
      transaction
        .objectStore("blobs")
        .index("by-mutation")
        .getAll(conflict.mutationId),
    ]);
    await transaction.done;
    return mutation
      ? conflictDetails(conflict, mutation, snapshot?.entity ?? null, blobs)
      : null;
  }

  async resolveConflict<R extends DataResource>(
    id: string,
    resolution: ConflictResolution<R>,
  ): Promise<ConflictResolutionResult | null> {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction(
      ["snapshots", "mutations", "blobs", "conflicts"],
      "readwrite",
    );
    const conflictStore = transaction.objectStore("conflicts");
    const mutationStore = transaction.objectStore("mutations");
    const direct = await conflictStore.get(id);
    const conflict =
      direct ??
      (await conflictStore.index("by-mutation").getAll(id)).sort(
        (left, right) => right.createdAt.localeCompare(left.createdAt),
      )[0];
    if (!conflict) {
      await transaction.done;
      return null;
    }
    const mutation = await mutationStore.get(conflict.mutationId);
    if (!mutation || mutation.status !== "conflict") {
      await transaction.done;
      return null;
    }

    const snapshot = await transaction
      .objectStore("snapshots")
      .get(
        dataEntityKey(conflict.userId, conflict.resource, conflict.clientId),
      );
    const hasRemoteOverride = Object.hasOwn(resolution, "remoteOverride");
    const remote = hasRemoteOverride
      ? ((resolution.remoteOverride ?? null) as
          EntityByResource[DataResource] | null)
      : latestRemote(conflict, snapshot?.entity ?? null);
    if (
      remote &&
      (remote.userId !== mutation.userId ||
        remote.clientId !== mutation.clientId)
    ) {
      transaction.abort();
      await transaction.done.catch(() => undefined);
      throw new Error(
        "Remote conflict override identity does not match request",
      );
    }
    const now = this.dependencies.now();
    if (hasRemoteOverride) {
      const snapshotStore = transaction.objectStore("snapshots");
      if (remote) {
        await snapshotStore.put({
          key: dataEntityKey(
            mutation.userId,
            mutation.resource,
            mutation.clientId,
          ),
          userId: mutation.userId,
          resource: mutation.resource,
          clientId: mutation.clientId,
          entity: remote,
          syncedAt: now,
          lastAccessedAt: now,
        } as AnySnapshotRecord);
      } else {
        await snapshotStore.delete(
          dataEntityKey(mutation.userId, mutation.resource, mutation.clientId),
        );
      }
    }

    if (resolution.action === "accept-remote") {
      const allMutations = await mutationStore
        .index("by-user")
        .getAll(mutation.userId);
      const entityMutations = allMutations.filter(
        (candidate) =>
          candidate.resource === mutation.resource &&
          candidate.clientId === mutation.clientId &&
          (candidate.createdAt > mutation.createdAt ||
            (candidate.createdAt === mutation.createdAt &&
              candidate.mutationId >= mutation.mutationId)),
      );
      const discarded = collectMutationTree(allMutations, entityMutations);
      const [blobs, conflicts] = await Promise.all([
        Promise.all(
          discarded.map((candidate) =>
            transaction
              .objectStore("blobs")
              .index("by-mutation")
              .getAll(candidate.mutationId),
          ),
        ),
        Promise.all(
          discarded.map((candidate) =>
            conflictStore.index("by-mutation").getAll(candidate.mutationId),
          ),
        ),
      ]);
      await Promise.all([
        ...blobs
          .flat()
          .map((blob) => transaction.objectStore("blobs").delete(blob.blobId)),
        ...conflicts
          .flat()
          .map((item) => conflictStore.delete(item.conflictId)),
        ...discarded.map((candidate) =>
          mutationStore.delete(candidate.mutationId),
        ),
      ]);
      await transaction.done;
      notifyMutation(this.dependencies, mutation, "mutation-changed");
      return { mutationId: mutation.mutationId, outcome: "accepted-remote" };
    }

    const conflictRecords = await conflictStore
      .index("by-mutation")
      .getAll(mutation.mutationId);
    // A delete against an already deleted record has reached the requested
    // state. Complete only that mutation so later independent work and
    // dependants can continue.
    if (
      mutation.kind === "delete" &&
      !remote &&
      resolution.action === "keep-local"
    ) {
      const blobs = await transaction
        .objectStore("blobs")
        .index("by-mutation")
        .getAll(mutation.mutationId);
      await Promise.all([
        ...blobs.map((blob) =>
          transaction.objectStore("blobs").delete(blob.blobId),
        ),
        ...conflictRecords.map((item) => conflictStore.delete(item.conflictId)),
        mutationStore.delete(mutation.mutationId),
      ]);
      await transaction.done;
      notifyMutation(this.dependencies, mutation, "mutation-changed");
      return { mutationId: mutation.mutationId, outcome: "already-applied" };
    }

    const mergeChanges =
      resolution.action === "merge"
        ? (resolution.changes as DataByResource[DataResource])
        : null;
    let next: AnyMutationRecord;
    if (!remote) {
      const changes =
        mergeChanges ??
        businessData(conflict.local as EntityByResource[DataResource]);
      next = {
        ...mutation,
        kind: "create",
        baseVersion: null,
        changes,
        optimistic: {
          ...conflict.local,
          ...changes,
          version: 0,
          updatedAt: now,
        },
        status: "queued",
        attemptCount: 0,
        nextAttemptAt: now,
        updatedAt: now,
        sendingStartedAt: undefined,
        blockedReason: undefined,
        lastError: undefined,
        conflictRecoveryCreate: true,
      } as AnyMutationRecord;
    } else if (
      mutation.kind === "delete" &&
      resolution.action === "keep-local"
    ) {
      next = {
        ...mutation,
        kind: "delete",
        baseVersion: remote.version,
        changes: null,
        optimistic: remote,
        status: "queued",
        attemptCount: 0,
        nextAttemptAt: now,
        updatedAt: now,
        sendingStartedAt: undefined,
        blockedReason: undefined,
        lastError: undefined,
        conflictRecoveryCreate: undefined,
      } as AnyMutationRecord;
    } else {
      const changes =
        mergeChanges ??
        ((mutation.changes ?? businessData(conflict.local)) as Partial<
          DataByResource[DataResource]
        >);
      next = {
        ...mutation,
        kind: "patch",
        baseVersion: remote.version,
        changes,
        optimistic: {
          ...remote,
          ...changes,
          updatedAt: now,
        },
        status: "queued",
        attemptCount: 0,
        nextAttemptAt: now,
        updatedAt: now,
        sendingStartedAt: undefined,
        blockedReason: undefined,
        lastError: undefined,
        conflictRecoveryCreate: undefined,
      } as AnyMutationRecord;
    }

    const obsoleteImageBlobs =
      resolution.action === "merge" &&
      conflict.resource === "moments" &&
      resolution.fieldSources.imagePath !== "local"
        ? (
            await transaction
              .objectStore("blobs")
              .index("by-mutation")
              .getAll(mutation.mutationId)
          ).filter((blob) => blob.slot === "image")
        : [];
    await Promise.all([
      mutationStore.put(next),
      ...conflictRecords.map((item) => conflictStore.delete(item.conflictId)),
      ...obsoleteImageBlobs.map((blob) =>
        transaction.objectStore("blobs").delete(blob.blobId),
      ),
    ]);
    await transaction.done;
    notifyMutation(this.dependencies, next, "mutation-changed");
    return { mutationId: mutation.mutationId, outcome: "requeued" };
  }

  async listPending(userId: string) {
    const db = await this.dependencies.database.open();
    return db.getAllFromIndex("mutations", "by-user", userId);
  }

  async listForResource<R extends DataResource>(userId: string, resource: R) {
    const db = await this.dependencies.database.open();
    return db.getAllFromIndex("mutations", "by-user-resource", [
      userId,
      resource,
    ]) as Promise<MutationRecord<R>[]>;
  }

  async getDiagnostics(userId: string): Promise<DataV2Diagnostics> {
    const [mutations, conflicts] = await Promise.all([
      this.listPending(userId),
      this.listConflicts(userId),
    ]);
    return {
      queued: mutations.filter((mutation) => mutation.status === "queued")
        .length,
      sending: mutations.filter((mutation) => mutation.status === "sending")
        .length,
      blocked: mutations.filter((mutation) => mutation.status === "blocked")
        .length,
      conflicts: conflicts.length,
      mutations,
    };
  }

  async discard(mutationId: string) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction(
      ["snapshots", "mutations", "blobs", "conflicts"],
      "readwrite",
    );
    const mutation = await transaction.objectStore("mutations").get(mutationId);
    if (!mutation) {
      await transaction.done;
      return false;
    }
    const allMutations = await transaction
      .objectStore("mutations")
      .index("by-user")
      .getAll(mutation.userId);
    const entityMutations = allMutations.filter(
      (candidate) =>
        candidate.resource === mutation.resource &&
        candidate.clientId === mutation.clientId &&
        (candidate.createdAt > mutation.createdAt ||
          (candidate.createdAt === mutation.createdAt &&
            candidate.mutationId >= mutation.mutationId)),
    );
    const dependentMutations = collectMutationTree(
      allMutations,
      entityMutations,
    );
    const [blobs, conflicts] = await Promise.all([
      Promise.all(
        dependentMutations.map((candidate) =>
          transaction
            .objectStore("blobs")
            .index("by-mutation")
            .getAll(candidate.mutationId),
        ),
      ),
      Promise.all(
        dependentMutations.map((candidate) =>
          transaction
            .objectStore("conflicts")
            .index("by-mutation")
            .getAll(candidate.mutationId),
        ),
      ),
    ]);
    await Promise.all([
      ...blobs
        .flat()
        .map((blob) => transaction.objectStore("blobs").delete(blob.blobId)),
      ...conflicts
        .flat()
        .map((conflict) =>
          transaction.objectStore("conflicts").delete(conflict.conflictId),
        ),
      ...dependentMutations.map((candidate) =>
        transaction.objectStore("mutations").delete(candidate.mutationId),
      ),
    ]);
    await transaction.done;
    notifyMutation(this.dependencies, mutation, "mutation-changed");
    return true;
  }
}
