import type {
  AnyMutationRecord,
  DataResource,
  DataV2StoreApi,
  EntityByResource,
} from "../../../lib/data-v2";
import { loadRemoteResource } from "../data/remoteRepositoryV2";

const EXPORT_RESOURCES = [
  "profiles",
  "moments",
  "reflections",
  "goals",
  "habits",
  "habit_checkins",
] as const satisfies readonly DataResource[];

type ExportCollections = {
  [R in DataResource]: EntityByResource[R][];
};

export type WorkspaceExportPayload = ExportCollections & {
  schemaVersion: 2;
  exportedAt: string;
  pendingMutations: Array<{
    mutationId: string;
    resource: DataResource;
    clientId: string;
    kind: AnyMutationRecord["kind"];
    status: AnyMutationRecord["status"];
    baseVersion: number | null;
    changes: unknown;
    error: string | null;
    attachments: Array<{
      slot: string;
      fileName: string;
      mimeType: string;
      size: number;
    }>;
  }>;
  conflicts: Awaited<ReturnType<DataV2StoreApi["listConflicts"]>>;
};

function sortEntities<R extends DataResource>(items: EntityByResource[R][]) {
  return [...items].sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      left.clientId.localeCompare(right.clientId),
  );
}

function applyMutations<R extends DataResource>(
  remote: EntityByResource[R][],
  mutations: AnyMutationRecord[],
  resource: R,
) {
  const entities = new Map(
    remote.map((entity) => [entity.clientId, entity] as const),
  );
  mutations
    .filter((mutation) => mutation.resource === resource)
    .sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.mutationId.localeCompare(right.mutationId),
    )
    .forEach((mutation) => {
      if (mutation.kind === "delete") {
        entities.delete(mutation.clientId);
        return;
      }
      entities.set(mutation.clientId, {
        ...(mutation.optimistic as EntityByResource[R]),
        sync: {
          pending:
            mutation.status === "queued" || mutation.status === "sending",
          blocked: mutation.status === "blocked",
          conflict: mutation.status === "conflict",
        },
      });
    });
  return sortEntities([...entities.values()]);
}

export async function loadWorkspaceExportPayload(
  userId: string,
  store: DataV2StoreApi,
  exportedAt = new Date().toISOString(),
): Promise<WorkspaceExportPayload> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("完整导出需要联网读取云端历史数据");
  }

  const [remoteCollections, mutations, conflicts] = await Promise.all([
    Promise.all(
      EXPORT_RESOURCES.map((resource) =>
        loadRemoteResource(userId, resource, {
          fullHistory: true,
        }),
      ),
    ),
    store.listPendingMutations(userId),
    store.listConflicts(userId),
  ]);

  const attachmentEntries = await Promise.all(
    mutations.map(async (mutation) => {
      const blobs = await store.getMutationBlobs(mutation.mutationId);
      return [
        mutation.mutationId,
        blobs.map((blob) => ({
          slot: blob.slot,
          fileName: blob.fileName,
          mimeType: blob.mimeType,
          size: blob.blob.size,
        })),
      ] as const;
    }),
  );
  const attachments = new Map(attachmentEntries);
  const remote = Object.fromEntries(
    EXPORT_RESOURCES.map((resource, index) => [
      resource,
      remoteCollections[index],
    ]),
  ) as ExportCollections;

  return {
    schemaVersion: 2,
    exportedAt,
    profiles: applyMutations(remote.profiles, mutations, "profiles"),
    moments: applyMutations(remote.moments, mutations, "moments"),
    reflections: applyMutations(remote.reflections, mutations, "reflections"),
    goals: applyMutations(remote.goals, mutations, "goals"),
    habits: applyMutations(remote.habits, mutations, "habits"),
    habit_checkins: applyMutations(
      remote.habit_checkins,
      mutations,
      "habit_checkins",
    ),
    pendingMutations: mutations.map((mutation) => ({
      mutationId: mutation.mutationId,
      resource: mutation.resource,
      clientId: mutation.clientId,
      kind: mutation.kind,
      status: mutation.status,
      baseVersion: mutation.baseVersion,
      changes: mutation.changes,
      error: mutation.lastError ?? null,
      attachments: attachments.get(mutation.mutationId) ?? [],
    })),
    conflicts,
  };
}

export function downloadJsonFile(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
