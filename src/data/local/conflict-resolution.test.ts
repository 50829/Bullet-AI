import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type {
  HabitCheckinEntity,
  HabitEntity,
  MomentEntity,
} from "../../domain/entities";
import { DataStore } from "./store";

const stores: DataStore[] = [];

function moment(
  version: number,
  content = `version-${version}`,
  occurredOn = "2026-07-10",
): MomentEntity {
  return {
    userId: "user-1",
    clientId: "moment-1",
    version,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: `2026-07-10T00:0${version}:00.000Z`,
    content,
    occurredOn,
    imagePath: null,
  };
}

function habit(): HabitEntity {
  return {
    userId: "user-1",
    clientId: "habit-1",
    version: 0,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    name: "Read",
    description: null,
    frequency: "daily",
    color: null,
    startedOn: "2026-07-10",
  };
}

function checkin(): HabitCheckinEntity {
  return {
    userId: "user-1",
    clientId: "habit-checkin:habit-1:2026-07-10",
    version: 0,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    habitClientId: "habit-1",
    checkedOn: "2026-07-10",
  };
}

function createStore() {
  let tick = 0;
  const store = new DataStore({
    databaseName: `conflict-resolution-${crypto.randomUUID()}`,
    now: () => new Date(Date.UTC(2026, 6, 10, 0, 0, tick++)),
  });
  stores.push(store);
  return store;
}

async function enqueueMomentPatch(
  store: DataStore,
  changes: Partial<Pick<MomentEntity, "content" | "occurredOn" | "imagePath">>,
  blobs?: Array<{ slot: string; blob: Blob; fileName: string }>,
) {
  const local = { ...moment(1), ...changes };
  const mutation = await store.enqueueMutation({
    userId: "user-1",
    resource: "moments",
    clientId: local.clientId,
    kind: "patch",
    baseVersion: 1,
    changes,
    optimistic: local,
    blobs,
  });
  await store.claimMutation(mutation!.mutationId);
  return mutation!;
}

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe("DataStore conflict resolution", () => {
  it("returns complete details by conflict or mutation id and rebases a patch", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const mutation = await enqueueMomentPatch(store, { content: "local" });
    await store.recordConflict(
      mutation.mutationId,
      moment(2, "cloud", "2026-07-11"),
      "Remote record changed",
    );
    // A background refresh may observe an even newer cloud version while the
    // user is reviewing the conflict.
    await store.putSnapshot("moments", moment(3, "latest cloud", "2026-07-12"));

    const [listed] = await store.listConflictDetails("user-1");
    expect(listed).toMatchObject({
      mutationId: mutation.mutationId,
      resource: "moments",
      kind: "patch",
      changes: { content: "local" },
      local: { content: "local" },
      remote: { version: 3, content: "latest cloud" },
      mutation: { status: "conflict" },
    });
    await expect(store.getConflictDetails(listed.conflictId)).resolves.toEqual(
      listed,
    );
    await expect(
      store.getConflictDetails(mutation.mutationId),
    ).resolves.toEqual(listed);

    await expect(
      store.resolveConflict(mutation.mutationId, { action: "keep-local" }),
    ).resolves.toMatchObject({ outcome: "requeued" });

    await expect(store.listPendingMutations("user-1")).resolves.toEqual([
      expect.objectContaining({
        mutationId: mutation.mutationId,
        kind: "patch",
        status: "queued",
        baseVersion: 3,
        changes: { content: "local" },
        optimistic: expect.objectContaining({
          version: 3,
          content: "local",
          occurredOn: "2026-07-12",
        }),
      }),
    ]);
    await expect(store.listConflicts("user-1")).resolves.toEqual([]);
  });

  it("turns a local edit into an idempotent create when remote was deleted", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const mutation = await enqueueMomentPatch(store, {
      content: "restore me",
    });
    await store.recordConflict(
      mutation.mutationId,
      null,
      "Remote record was deleted",
    );

    await store.resolveConflict(mutation.mutationId, { action: "keep-local" });

    await expect(store.listPendingMutations("user-1")).resolves.toEqual([
      expect.objectContaining({
        mutationId: mutation.mutationId,
        kind: "create",
        conflictRecoveryCreate: true,
        status: "queued",
        baseVersion: null,
        changes: {
          content: "restore me",
          occurredOn: "2026-07-10",
          imagePath: null,
        },
        optimistic: expect.objectContaining({ version: 0 }),
      }),
    ]);
  });

  it("rebases delete conflicts and treats an already deleted remote as applied", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const first = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "delete",
      baseVersion: 1,
      optimistic: moment(1),
    });
    await store.claimMutation(first!.mutationId);
    await store.recordConflict(first!.mutationId, moment(3), "newer remote");
    await store.resolveConflict(first!.mutationId, { action: "keep-local" });
    await expect(store.listPendingMutations("user-1")).resolves.toEqual([
      expect.objectContaining({
        mutationId: first!.mutationId,
        kind: "delete",
        baseVersion: 3,
        status: "queued",
      }),
    ]);

    await store.claimMutation(first!.mutationId);
    await store.recordConflict(first!.mutationId, null, "already deleted");
    await expect(
      store.resolveConflict(first!.mutationId, { action: "keep-local" }),
    ).resolves.toMatchObject({ outcome: "already-applied" });
    await expect(store.listPendingMutations("user-1")).resolves.toEqual([]);
    await expect(store.listConflicts("user-1")).resolves.toEqual([]);
  });

  it("queues explicitly merged business fields on the latest cloud version", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const mutation = await enqueueMomentPatch(store, { content: "local" });
    await store.recordConflict(
      mutation.mutationId,
      moment(4, "cloud", "2026-07-12"),
      "newer remote",
    );

    await store.resolveConflict(mutation.mutationId, {
      action: "merge",
      changes: {
        content: "combined",
        occurredOn: "2026-07-12",
        imagePath: null,
      },
      fieldSources: {
        content: "custom",
        occurredOn: "remote",
        imagePath: "remote",
      },
    });

    await expect(store.listPendingMutations("user-1")).resolves.toEqual([
      expect.objectContaining({
        kind: "patch",
        baseVersion: 4,
        changes: {
          content: "combined",
          occurredOn: "2026-07-12",
          imagePath: null,
        },
        optimistic: expect.objectContaining({
          version: 4,
          content: "combined",
        }),
      }),
    ]);
  });

  it("preserves dependency ids and blobs on retry, then honors a cloud image source", async () => {
    const store = createStore();
    const parentEntity = habit();
    const parent = await store.enqueueMutation({
      userId: "user-1",
      resource: "habits",
      clientId: parentEntity.clientId,
      kind: "create",
      baseVersion: null,
      optimistic: parentEntity,
      changes: {
        name: parentEntity.name,
        description: parentEntity.description,
        frequency: parentEntity.frequency,
        color: parentEntity.color,
        startedOn: parentEntity.startedOn,
      },
    });
    const childEntity = checkin();
    const child = await store.enqueueMutation({
      userId: "user-1",
      resource: "habit_checkins",
      clientId: childEntity.clientId,
      kind: "create",
      baseVersion: null,
      optimistic: childEntity,
      changes: {
        habitClientId: childEntity.habitClientId,
        checkedOn: childEntity.checkedOn,
      },
    });
    await store.claimMutation(parent!.mutationId);
    await store.recordConflict(parent!.mutationId, null, "missing remote");
    await store.resolveConflict(parent!.mutationId, { action: "keep-local" });
    expect(
      (await store.listPendingMutations("user-1")).find(
        (item) => item.mutationId === child!.mutationId,
      ),
    ).toMatchObject({ dependsOnMutationId: parent!.mutationId });
    await expect(
      store.listRunnableMutations("user-1", "9999-12-31T00:00:00.000Z"),
    ).resolves.toEqual([
      expect.objectContaining({ mutationId: parent!.mutationId }),
    ]);

    const imageMutation = await enqueueMomentPatch(
      store,
      { content: "with image", imagePath: null },
      [
        {
          slot: "image",
          blob: new Blob(["pixels"], { type: "image/png" }),
          fileName: "image.png",
        },
      ],
    );
    await store.recordConflict(imageMutation.mutationId, moment(2), "newer");
    await expect(
      store.getConflictDetails(imageMutation.mutationId),
    ).resolves.toMatchObject({
      blobs: [expect.objectContaining({ fileName: "image.png" })],
    });
    await store.resolveConflict(imageMutation.mutationId, {
      action: "keep-local",
    });
    await expect(
      store.getMutationBlobs(imageMutation.mutationId),
    ).resolves.toHaveLength(1);

    await store.claimMutation(imageMutation.mutationId);
    await store.recordConflict(imageMutation.mutationId, moment(3), "newer");
    await store.resolveConflict(imageMutation.mutationId, {
      action: "merge",
      changes: {
        content: "cloud image choice",
        occurredOn: "2026-07-10",
        imagePath: null,
      },
      fieldSources: {
        content: "custom",
        occurredOn: "remote",
        imagePath: "remote",
      },
    });
    await expect(
      store.getMutationBlobs(imageMutation.mutationId),
    ).resolves.toEqual([]);
  });

  it("uses an explicit remote tombstone instead of a stale conflict record", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const mutation = await enqueueMomentPatch(store, { content: "restore" });
    await store.recordConflict(mutation.mutationId, moment(2), "newer remote");

    await store.resolveConflict(mutation.mutationId, {
      action: "keep-local",
      remoteOverride: null,
    });

    await expect(store.listPendingMutations("user-1")).resolves.toEqual([
      expect.objectContaining({
        kind: "create",
        baseVersion: null,
        conflictRecoveryCreate: true,
      }),
    ]);
    await expect(store.readCollection("user-1", "moments")).resolves.toEqual(
      [],
    );
  });
});
