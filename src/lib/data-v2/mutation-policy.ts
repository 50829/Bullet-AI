import type {
  AnyMutationRecord,
  DataResource,
  EnqueueMutationInput,
  EntityByResource,
  MutationRecord,
} from "./types";

export type MutationCompaction<R extends DataResource> =
  MutationRecord<R> | "cancel" | null;

export function compactQueuedMutation<R extends DataResource>(
  previous: MutationRecord<R>,
  next: EnqueueMutationInput<R>,
  now: string,
): MutationCompaction<R> {
  if (previous.status !== "queued" || previous.attemptCount !== 0) return null;
  if (previous.kind === "create" && next.kind === "patch") {
    return {
      ...previous,
      changes: { ...previous.changes, ...next.changes },
      optimistic: next.optimistic,
      cleanup: previous.cleanup ?? next.cleanup,
      updatedAt: now,
    } as MutationRecord<R>;
  }
  if (previous.kind === "create" && next.kind === "delete") return "cancel";
  if (previous.kind === "patch" && next.kind === "patch") {
    return {
      ...previous,
      changes: { ...previous.changes, ...next.changes },
      optimistic: next.optimistic,
      cleanup: previous.cleanup ?? next.cleanup,
      updatedAt: now,
    } as MutationRecord<R>;
  }
  if (previous.kind === "patch" && next.kind === "delete") {
    return {
      ...previous,
      kind: "delete",
      changes: null,
      optimistic: next.optimistic,
      cleanup: previous.cleanup ?? next.cleanup,
      updatedAt: now,
    } as MutationRecord<R>;
  }
  return null;
}

export function rebaseQueuedMutation(
  mutation: AnyMutationRecord,
  remote: EntityByResource[DataResource],
  now: string,
): AnyMutationRecord {
  if (mutation.status !== "queued" || mutation.kind === "create") {
    return mutation;
  }
  if (mutation.kind === "delete") {
    return { ...mutation, baseVersion: remote.version, updatedAt: now };
  }
  return {
    ...mutation,
    baseVersion: remote.version,
    optimistic: {
      ...remote,
      ...mutation.changes,
      updatedAt: mutation.optimistic.updatedAt,
    },
    updatedAt: now,
  } as AnyMutationRecord;
}
