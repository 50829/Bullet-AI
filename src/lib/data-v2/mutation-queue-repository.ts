import type { IDBPObjectStore } from "idb";
import { dataEntityKey, type DataV2Schema } from "./database";
import { compactQueuedMutation } from "./mutation-policy";
import {
  assertCurrentUserSession,
  collectMutationTree,
  compareMutations,
  dependencyReadyMutationHeads,
  notifyMutation,
  type MutationRepositoryDependencies,
} from "./mutation-repository-internal";
import type {
  AnyMutationRecord,
  DataResource,
  EnqueueMutationInput,
  EntityByResource,
  MutationRecord,
} from "./types";

export class MutationQueueRepository {
  constructor(private readonly dependencies: MutationRepositoryDependencies) {}

  async enqueue<R extends DataResource>(
    input: EnqueueMutationInput<R>,
  ): Promise<MutationRecord<R> | null> {
    const { database, now: getNow, createId, notifier } = this.dependencies;
    const sessionToken = database.getUserSessionToken(input.userId);
    assertCurrentUserSession(this.dependencies, input.userId, sessionToken);
    await database.waitForUserCleanup(input.userId, sessionToken);
    assertCurrentUserSession(this.dependencies, input.userId, sessionToken);
    if (
      input.optimistic.userId !== input.userId ||
      input.optimistic.clientId !== input.clientId
    ) {
      throw new Error("Optimistic entity identity does not match mutation");
    }

    const db = await database.open();
    assertCurrentUserSession(this.dependencies, input.userId, sessionToken);
    const now = getNow();
    const transaction = db.transaction(
      ["snapshots", "mutations", "blobs"],
      "readwrite",
    );
    const snapshotStore = transaction.objectStore("snapshots");
    const mutationStore = transaction.objectStore("mutations");
    const blobStore = transaction.objectStore("blobs");
    if (input.kind !== "create") {
      const snapshot = await snapshotStore.get(
        dataEntityKey(input.userId, input.resource, input.clientId),
      );
      if (
        snapshot?.lastMutationId &&
        snapshot.entity.version > input.baseVersion
      ) {
        input = {
          ...input,
          baseVersion: snapshot.entity.version,
          optimistic:
            input.kind === "delete"
              ? snapshot.entity
              : {
                  ...snapshot.entity,
                  ...input.changes,
                  updatedAt: input.optimistic.updatedAt,
                },
        } as EnqueueMutationInput<R>;
      }
    }

    const existing = await mutationStore
      .index("by-user-entity")
      .getAll([input.userId, input.resource, input.clientId]);
    const dependsOnMutationId = await this.findHabitDependency(
      mutationStore,
      input,
    );
    if (
      existing.some(
        (mutation) =>
          mutation.status === "blocked" || mutation.status === "conflict",
      )
    ) {
      await transaction.done;
      throw new Error(
        "Resolve the existing sync issue before changing this record",
      );
    }

    const compactable = existing
      .filter(
        (mutation) =>
          mutation.status === "queued" && mutation.attemptCount === 0,
      )
      .sort(compareMutations)
      .at(-1) as MutationRecord<R> | undefined;
    if (compactable) {
      const compacted = compactQueuedMutation(compactable, input, now);
      if (compacted === "cancel") {
        const all = await mutationStore.index("by-user").getAll(input.userId);
        const cancelled = collectMutationTree(all, [
          compactable as AnyMutationRecord,
        ]);
        const blobs = await Promise.all(
          cancelled.map((mutation) =>
            blobStore.index("by-mutation").getAll(mutation.mutationId),
          ),
        );
        await Promise.all([
          ...cancelled.map((mutation) =>
            mutationStore.delete(mutation.mutationId),
          ),
          ...blobs.flat().map((blob) => blobStore.delete(blob.blobId)),
        ]);
        await transaction.done;
        cancelled.forEach((mutation) =>
          notifyMutation(this.dependencies, mutation, "mutation-changed"),
        );
        return null;
      }
      if (compacted) {
        await mutationStore.put(compacted as AnyMutationRecord);
        await this.replaceBlobs(blobStore, compacted.mutationId, input, now);
        await transaction.done;
        notifyMutation(
          this.dependencies,
          compacted as AnyMutationRecord,
          "mutation-changed",
        );
        return compacted;
      }
    }

    const mutationId = createId();
    const mutation = {
      mutationId,
      userId: input.userId,
      resource: input.resource,
      clientId: input.clientId,
      kind: input.kind,
      baseVersion: input.baseVersion,
      optimistic: input.optimistic,
      changes: input.kind === "delete" ? null : input.changes,
      status: "queued",
      attemptCount: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
      dependsOnMutationId,
      cleanup: input.cleanup,
    } as MutationRecord<R>;

    await mutationStore.add(mutation as AnyMutationRecord);
    await Promise.all(
      (input.blobs ?? []).map((file, index) =>
        blobStore.add({
          blobId: `${mutationId}:${index}:${createId()}`,
          mutationId,
          userId: input.userId,
          slot: file.slot,
          blob: file.blob,
          fileName: file.fileName,
          mimeType: file.blob.type,
          createdAt: now,
        }),
      ),
    );
    await transaction.done;

    notifier?.publish({
      type: "mutation-enqueued",
      userId: input.userId,
      resource: input.resource,
      clientId: input.clientId,
      mutationId,
    });
    return mutation;
  }

  async listRunnable(userId: string, now: string) {
    const all = await (
      await this.dependencies.database.open()
    ).getAllFromIndex("mutations", "by-user", userId);
    return dependencyReadyMutationHeads(all).filter(
      (mutation) =>
        mutation.status === "queued" && mutation.nextAttemptAt <= now,
    );
  }

  async claim(mutationId: string) {
    const db = await this.dependencies.database.open();
    const transaction = db.transaction("mutations", "readwrite");
    const store = transaction.objectStore("mutations");
    const current = await store.get(mutationId);
    if (!current || current.status !== "queued") {
      await transaction.done;
      return null;
    }
    if (
      current.dependsOnMutationId &&
      (await store.get(current.dependsOnMutationId))
    ) {
      await transaction.done;
      return null;
    }
    const now = this.dependencies.now();
    const next: AnyMutationRecord = {
      ...current,
      status: "sending",
      attemptCount: current.attemptCount + 1,
      sendingStartedAt: now,
      updatedAt: now,
    };
    await store.put(next);
    await transaction.done;
    return next;
  }

  async getBlobs(mutationId: string) {
    const db = await this.dependencies.database.open();
    return db.getAllFromIndex("blobs", "by-mutation", mutationId);
  }

  async getNextQueuedAt(userId: string) {
    const mutations = await (
      await this.dependencies.database.open()
    ).getAllFromIndex("mutations", "by-user", userId);
    const queued = dependencyReadyMutationHeads(mutations).filter(
      (mutation) => mutation.status === "queued",
    );
    return (
      queued
        .map((mutation) => mutation.nextAttemptAt)
        .sort((left, right) => left.localeCompare(right))[0] ?? null
    );
  }

  private async findHabitDependency<R extends DataResource>(
    store: IDBPObjectStore<
      DataV2Schema,
      ("snapshots" | "mutations" | "blobs")[],
      "mutations",
      "readwrite"
    >,
    input: EnqueueMutationInput<R>,
  ) {
    if (input.resource !== "habit_checkins" || input.kind !== "create") {
      return undefined;
    }
    return (
      await store
        .index("by-user-entity")
        .getAll([
          input.userId,
          "habits",
          (input.optimistic as EntityByResource["habit_checkins"])
            .habitClientId,
        ])
    )
      .filter((mutation) => mutation.kind === "create")
      .sort(compareMutations)[0]?.mutationId;
  }

  private async replaceBlobs<R extends DataResource>(
    store: IDBPObjectStore<
      DataV2Schema,
      ("snapshots" | "mutations" | "blobs")[],
      "blobs",
      "readwrite"
    >,
    mutationId: string,
    input: EnqueueMutationInput<R>,
    now: string,
  ) {
    const existing = await store.index("by-mutation").getAll(mutationId);
    if (input.kind === "delete") {
      await Promise.all(existing.map((file) => store.delete(file.blobId)));
      return;
    }
    const slots = new Set((input.blobs ?? []).map((file) => file.slot));
    if (
      input.resource === "moments" &&
      Object.hasOwn(input.changes, "imagePath") &&
      !(input.blobs ?? []).some((file) => file.slot === "image")
    ) {
      slots.add("image");
    }
    if (slots.size === 0) return;
    await Promise.all([
      ...existing
        .filter((file) => slots.has(file.slot))
        .map((file) => store.delete(file.blobId)),
      ...(input.blobs ?? []).map((file, index) =>
        store.add({
          blobId: `${mutationId}:${index}:${this.dependencies.createId()}`,
          mutationId,
          userId: input.userId,
          slot: file.slot,
          blob: file.blob,
          fileName: file.fileName,
          mimeType: file.blob.type,
          createdAt: now,
        }),
      ),
    ]);
  }
}
