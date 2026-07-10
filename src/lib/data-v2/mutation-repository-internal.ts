import type { DataV2Notifier } from "./channel";
import { DataV2Database, dataEntityKey } from "./database";
import type { AnyMutationRecord } from "./types";

export interface MutationRepositoryDependencies {
  database: DataV2Database;
  now: () => string;
  createId: () => string;
  notifier?: DataV2Notifier;
}

export function compareMutations(
  left: AnyMutationRecord,
  right: AnyMutationRecord,
) {
  return (
    left.createdAt.localeCompare(right.createdAt) ||
    left.mutationId.localeCompare(right.mutationId)
  );
}

function firstMutationPerEntity(mutations: AnyMutationRecord[]) {
  const firstByEntity = new Map<string, AnyMutationRecord>();
  mutations.sort(compareMutations).forEach((mutation) => {
    const key = dataEntityKey(
      mutation.userId,
      mutation.resource,
      mutation.clientId,
    );
    if (!firstByEntity.has(key)) firstByEntity.set(key, mutation);
  });
  return [...firstByEntity.values()];
}

export function dependencyReadyMutationHeads(mutations: AnyMutationRecord[]) {
  const existingIds = new Set(mutations.map((mutation) => mutation.mutationId));
  return firstMutationPerEntity(mutations).filter(
    (mutation) =>
      !mutation.dependsOnMutationId ||
      !existingIds.has(mutation.dependsOnMutationId),
  );
}

export function collectMutationTree(
  mutations: AnyMutationRecord[],
  roots: AnyMutationRecord[],
) {
  const collected = new Map(
    roots.map((mutation) => [mutation.mutationId, mutation] as const),
  );
  let changed = true;
  while (changed) {
    changed = false;
    mutations.forEach((mutation) => {
      if (
        mutation.dependsOnMutationId &&
        collected.has(mutation.dependsOnMutationId) &&
        !collected.has(mutation.mutationId)
      ) {
        collected.set(mutation.mutationId, mutation);
        changed = true;
      }
    });
  }
  return [...collected.values()];
}

export function isCurrentMutation(
  dependencies: MutationRepositoryDependencies,
  mutation: AnyMutationRecord,
) {
  return (
    mutation.sessionToken === undefined ||
    dependencies.database.isUserSessionCurrent(
      mutation.userId,
      mutation.sessionToken,
    )
  );
}

export function assertCurrentUserSession(
  dependencies: MutationRepositoryDependencies,
  userId: string,
  sessionToken: number,
) {
  if (!dependencies.database.isUserSessionCurrent(userId, sessionToken)) {
    throw new Error("Local data for this signed-out user was already cleared");
  }
}

export function notifyMutation(
  dependencies: MutationRepositoryDependencies,
  mutation: AnyMutationRecord,
  type: "mutation-changed" | "snapshot-changed" | "conflict-recorded",
) {
  dependencies.notifier?.publish({
    type,
    userId: mutation.userId,
    resource: mutation.resource,
    clientId: mutation.clientId,
    mutationId: mutation.mutationId,
  });
}
