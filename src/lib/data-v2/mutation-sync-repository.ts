import { dataEntityKey } from "./database";
import { rebaseQueuedMutation } from "./mutation-policy";
import {
  compareMutations,
  isCurrentMutation,
  notifyMutation,
  type MutationRepositoryDependencies,
} from "./mutation-repository-internal";
import type {
  AnyConflictRecord,
  AnyMutationRecord,
  AnySnapshotRecord,
  DataResource,
  EntityByResource,
  MutationBlockedReason,
} from "./types";

function remoteMatchesMutation(
  mutation: AnyMutationRecord,
  remote: EntityByResource[DataResource],
) {
  return (
    remote.userId === mutation.userId && remote.clientId === mutation.clientId
  );
}

function resolveSnapshotResult(
  snapshot: AnySnapshotRecord | undefined,
  mutation: AnyMutationRecord,
  remote: EntityByResource[DataResource] | null,
) {
  const preserveCurrent = Boolean(
    snapshot &&
    (remote
      ? snapshot.entity.version > remote.version
      : snapshot.entity.version > (mutation.baseVersion ?? 0) ||
        Boolean(
          mutation.sendingStartedAt &&
          snapshot.syncedAt >= mutation.sendingStartedAt,
        )),
  );
  return {
    preserveCurrent,
    effectiveRemote: preserveCurrent ? snapshot!.entity : remote,
  };
}

export class MutationSyncRepository {
  constructor(private readonly dependencies: MutationRepositoryDependencies) {}

  async complete(
    mutationId: string,
    remote: EntityByResource[DataResource] | null,
  ) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction(
      ["snapshots", "mutations", "blobs", "conflicts"],
      "readwrite",
    );
    const mutation = await transaction.objectStore("mutations").get(mutationId);
    if (!mutation || !isCurrentMutation(this.dependencies, mutation)) {
      await transaction.done;
      return;
    }
    if (remote && !remoteMatchesMutation(mutation, remote)) {
      transaction.abort();
      await transaction.done.catch(() => undefined);
      throw new Error("Remote mutation result identity does not match request");
    }

    const snapshotKey = dataEntityKey(
      mutation.userId,
      mutation.resource,
      mutation.clientId,
    );
    const snapshotStore = transaction.objectStore("snapshots");
    const snapshotResult = resolveSnapshotResult(
      await snapshotStore.get(snapshotKey),
      mutation,
      remote,
    );
    if (remote && !snapshotResult.preserveCurrent) {
      const now = this.dependencies.now();
      await snapshotStore.put({
        key: snapshotKey,
        userId: mutation.userId,
        resource: mutation.resource,
        clientId: mutation.clientId,
        entity: remote,
        syncedAt: now,
        lastAccessedAt: now,
        lastMutationId: mutationId,
      } as AnySnapshotRecord);
    } else if (!remote && !snapshotResult.preserveCurrent) {
      await snapshotStore.delete(snapshotKey);
    }

    const mutationStore = transaction.objectStore("mutations");
    const successors = await mutationStore
      .index("by-user-entity")
      .getAll([mutation.userId, mutation.resource, mutation.clientId]);
    const successor = successors
      .filter(
        (candidate) =>
          candidate.mutationId !== mutationId &&
          candidate.status === "queued" &&
          isCurrentMutation(this.dependencies, candidate),
      )
      .sort(compareMutations)[0];
    if (
      snapshotResult.effectiveRemote &&
      successor &&
      successor.kind !== "create"
    ) {
      await mutationStore.put(
        rebaseQueuedMutation(
          successor,
          snapshotResult.effectiveRemote,
          this.dependencies.now(),
        ),
      );
    }

    const [blobs, conflicts] = await Promise.all([
      transaction.objectStore("blobs").index("by-mutation").getAll(mutationId),
      transaction
        .objectStore("conflicts")
        .index("by-mutation")
        .getAll(mutationId),
    ]);
    await Promise.all([
      ...blobs.map((blob) =>
        transaction.objectStore("blobs").delete(blob.blobId),
      ),
      ...conflicts.map((conflict) =>
        transaction.objectStore("conflicts").delete(conflict.conflictId),
      ),
    ]);
    await mutationStore.delete(mutationId);
    await transaction.done;
    notifyMutation(this.dependencies, mutation, "snapshot-changed");
  }

  async requeueTransient(
    mutationId: string,
    error: string,
    nextAttemptAt: string,
  ) {
    await this.updateMutation(mutationId, (current) => ({
      ...current,
      status: "queued",
      nextAttemptAt,
      updatedAt: this.dependencies.now(),
      lastError: error,
      sendingStartedAt: undefined,
      blockedReason: undefined,
    }));
  }

  async block(
    mutationId: string,
    reason: MutationBlockedReason,
    error: string,
  ) {
    await this.updateMutation(mutationId, (current) => ({
      ...current,
      status: "blocked",
      blockedReason: reason,
      lastError: error,
      sendingStartedAt: undefined,
      updatedAt: this.dependencies.now(),
    }));
  }

  async recordConflict(
    mutationId: string,
    remote: EntityByResource[DataResource] | null,
    reason: string,
  ) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction(
      ["snapshots", "mutations", "conflicts"],
      "readwrite",
    );
    const mutation = await transaction.objectStore("mutations").get(mutationId);
    if (!mutation || !isCurrentMutation(this.dependencies, mutation)) {
      await transaction.done;
      return;
    }
    if (remote && !remoteMatchesMutation(mutation, remote)) {
      transaction.abort();
      await transaction.done.catch(() => undefined);
      throw new Error("Remote conflict identity does not match request");
    }

    const now = this.dependencies.now();
    const conflicted: AnyMutationRecord = {
      ...mutation,
      status: "conflict",
      lastError: reason,
      sendingStartedAt: undefined,
      updatedAt: now,
    };
    await transaction.objectStore("mutations").put(conflicted);
    const snapshotKey = dataEntityKey(
      mutation.userId,
      mutation.resource,
      mutation.clientId,
    );
    const snapshotStore = transaction.objectStore("snapshots");
    const snapshotResult = resolveSnapshotResult(
      await snapshotStore.get(snapshotKey),
      mutation,
      remote,
    );
    if (remote && !snapshotResult.preserveCurrent) {
      await snapshotStore.put({
        key: snapshotKey,
        userId: remote.userId,
        resource: mutation.resource,
        clientId: remote.clientId,
        entity: remote,
        syncedAt: now,
        lastAccessedAt: now,
      } as AnySnapshotRecord);
    } else if (!remote && !snapshotResult.preserveCurrent) {
      await snapshotStore.delete(snapshotKey);
    }
    await transaction.objectStore("conflicts").add({
      conflictId: this.dependencies.createId(),
      mutationId,
      userId: mutation.userId,
      resource: mutation.resource,
      clientId: mutation.clientId,
      baseVersion: mutation.baseVersion,
      local: mutation.optimistic,
      remote,
      reason,
      createdAt: now,
    } as AnyConflictRecord);
    await transaction.done;
    notifyMutation(this.dependencies, mutation, "conflict-recorded");
  }

  async recoverSending(userId: string) {
    return this.updateMatching(userId, "sending", (mutation) => ({
      ...mutation,
      status: "queued",
      nextAttemptAt: this.dependencies.now(),
      sendingStartedAt: undefined,
      lastError: "Recovered after an interrupted sync",
      updatedAt: this.dependencies.now(),
    }));
  }

  async resumeAuthBlocked(userId: string) {
    return this.updateMatching(userId, "blocked", (mutation) =>
      mutation.blockedReason === "auth"
        ? {
            ...mutation,
            status: "queued",
            nextAttemptAt: this.dependencies.now(),
            blockedReason: undefined,
            lastError: undefined,
            updatedAt: this.dependencies.now(),
          }
        : null,
    );
  }

  private async updateMutation(
    mutationId: string,
    update: (current: AnyMutationRecord) => AnyMutationRecord,
  ) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction("mutations", "readwrite");
    const store = transaction.objectStore("mutations");
    const current = await store.get(mutationId);
    if (!current || !isCurrentMutation(this.dependencies, current)) {
      await transaction.done;
      return;
    }
    const next = update(current);
    await store.put(next);
    await transaction.done;
    notifyMutation(this.dependencies, next, "mutation-changed");
  }

  private async updateMatching(
    userId: string,
    status: string,
    update: (mutation: AnyMutationRecord) => AnyMutationRecord | null,
  ) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction("mutations", "readwrite");
    const store = transaction.objectStore("mutations");
    const matches = await store
      .index("by-user-status")
      .getAll([userId, status]);
    const updates = matches
      .filter((mutation) => isCurrentMutation(this.dependencies, mutation))
      .map(update)
      .filter((mutation): mutation is AnyMutationRecord => mutation !== null);
    await Promise.all(updates.map((mutation) => store.put(mutation)));
    await transaction.done;
    updates.forEach((mutation) =>
      notifyMutation(this.dependencies, mutation, "mutation-changed"),
    );
    return updates.length;
  }
}
