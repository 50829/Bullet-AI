import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AnyMutationRecord,
  DataResource,
  DataStoreApi,
  EntityByResource,
} from "@/data";

const mocks = vi.hoisted(() => ({
  remote: new Map<string, unknown[]>(),
  failure: null as Error | null,
  loadRemoteResource: vi.fn(),
}));

vi.mock("@/data/supabase", () => ({
  loadRemoteResource: mocks.loadRemoteResource,
}));

const { loadWorkspaceExportPayload } = await import("./workspaceExport");

const now = "2026-07-10T08:00:00.000Z";

function base(clientId: string) {
  return {
    clientId,
    userId: "user-1",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function remoteFixtures(): Record<DataResource, unknown[]> {
  return {
    profiles: [
      {
        ...base("user-1"),
        username: "Mira",
        preferredLanguage: "zh",
        accentColor: "sage",
        colorScheme: "system",
        completedGoalRetention: "next_day",
        weekStartsOn: "auto",
      },
    ],
    moments: [
      {
        ...base("moment-1"),
        content: "cloud",
        occurredOn: "2026-07-09",
        imagePath: null,
      },
    ],
    reflections: [],
    goals: [
      {
        ...base("goal-1"),
        title: "Remove me",
        description: "",
        dueDate: null,
        completedAt: null,
        color: null,
        sortOrder: 0,
      },
    ],
    habits: [],
    habit_checkins: [],
  };
}

function mutation(
  overrides: Partial<AnyMutationRecord> &
    Pick<AnyMutationRecord, "resource" | "clientId" | "kind" | "optimistic">,
): AnyMutationRecord {
  return {
    mutationId: `mutation-${overrides.clientId}`,
    userId: "user-1",
    baseVersion: overrides.kind === "create" ? null : 1,
    changes: overrides.kind === "delete" ? null : {},
    status: "queued",
    attemptCount: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as AnyMutationRecord;
}

function storeWith(mutations: AnyMutationRecord[] = []): DataStoreApi {
  return {
    listPendingMutations: vi.fn(async () => mutations),
    listConflicts: vi.fn(async () => []),
    getMutationBlobs: vi.fn(async (mutationId: string) =>
      mutationId === "mutation-moment-1"
        ? [
            {
              blobId: "blob-1",
              mutationId,
              userId: "user-1",
              slot: "image",
              blob: new Blob(["image"], { type: "image/jpeg" }),
              fileName: "moment.jpg",
              mimeType: "image/jpeg",
              createdAt: now,
            },
          ]
        : [],
    ),
  } as unknown as DataStoreApi;
}

describe("workspaceExport", () => {
  beforeEach(() => {
    mocks.remote = new Map(Object.entries(remoteFixtures()));
    mocks.failure = null;
    mocks.loadRemoteResource.mockReset();
    mocks.loadRemoteResource.mockImplementation(
      async (_userId: string, resource: DataResource) => {
        if (mocks.failure) throw mocks.failure;
        return mocks.remote.get(resource) ?? [];
      },
    );
  });

  it("requests full cloud history for every resource", async () => {
    const payload = await loadWorkspaceExportPayload(
      "user-1",
      storeWith(),
      now,
    );

    expect(mocks.loadRemoteResource).toHaveBeenCalledTimes(6);
    expect(mocks.loadRemoteResource).toHaveBeenCalledWith("user-1", "moments", {
      fullHistory: true,
    });
    expect(payload.schemaVersion).toBe(2);
    expect(payload.exportedAt).toBe(now);
    expect(payload.profiles[0]).toEqual(
      expect.objectContaining({ username: "Mira" }),
    );
  });

  it("overlays queued writes and includes attachment metadata", async () => {
    const updatedMoment: EntityByResource["moments"] = {
      ...(remoteFixtures().moments[0] as EntityByResource["moments"]),
      content: "local draft",
    };
    const newReflection: EntityByResource["reflections"] = {
      ...base("reflection-1"),
      title: "Offline",
      body: "Draft",
    };
    const mutations = [
      mutation({
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        optimistic: updatedMoment,
        changes: { content: "local draft" },
      }),
      mutation({
        resource: "goals",
        clientId: "goal-1",
        kind: "delete",
        optimistic: remoteFixtures().goals[0] as EntityByResource["goals"],
      }),
      mutation({
        resource: "reflections",
        clientId: "reflection-1",
        kind: "create",
        optimistic: newReflection,
        changes: { title: "Offline", body: "Draft" },
      }),
    ];

    const payload = await loadWorkspaceExportPayload(
      "user-1",
      storeWith(mutations),
      now,
    );

    expect(payload.moments[0]).toEqual(
      expect.objectContaining({
        content: "local draft",
        sync: expect.objectContaining({ pending: true }),
      }),
    );
    expect(payload.goals).toEqual([]);
    expect(payload.reflections[0]).toEqual(
      expect.objectContaining({ title: "Offline" }),
    );
    expect(payload.pendingMutations[0].attachments).toEqual([
      expect.objectContaining({ fileName: "moment.jpg", size: 5 }),
    ]);
  });

  it("fails rather than exporting a partial cache", async () => {
    mocks.failure = new Error("remote unavailable");

    await expect(
      loadWorkspaceExportPayload("user-1", storeWith(), now),
    ).rejects.toThrow("remote unavailable");
  });
});
