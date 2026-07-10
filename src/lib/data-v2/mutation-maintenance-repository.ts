import {
  collectMutationTree,
  isCurrentMutation,
  notifyMutation,
  type MutationRepositoryDependencies,
} from "./mutation-repository-internal";
import type { DataResource, DataV2Diagnostics, MutationRecord } from "./types";

export class MutationMaintenanceRepository {
  constructor(private readonly dependencies: MutationRepositoryDependencies) {}

  async listConflicts(userId: string) {
    const db = await this.dependencies.database.open();
    return db.getAllFromIndex("conflicts", "by-user", userId);
  }

  async listPending(userId: string) {
    const db = await this.dependencies.database.open();
    return (await db.getAllFromIndex("mutations", "by-user", userId)).filter(
      (mutation) => isCurrentMutation(this.dependencies, mutation),
    );
  }

  async listForResource<R extends DataResource>(userId: string, resource: R) {
    const db = await this.dependencies.database.open();
    return (
      await db.getAllFromIndex("mutations", "by-user-resource", [
        userId,
        resource,
      ])
    ).filter((mutation) =>
      isCurrentMutation(this.dependencies, mutation),
    ) as MutationRecord<R>[];
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
    if (!mutation || !isCurrentMutation(this.dependencies, mutation)) {
      await transaction.done;
      return false;
    }
    const allMutations = (
      await transaction
        .objectStore("mutations")
        .index("by-user")
        .getAll(mutation.userId)
    ).filter((candidate) => isCurrentMutation(this.dependencies, candidate));
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
