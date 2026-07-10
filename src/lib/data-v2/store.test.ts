import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type {
  HabitCheckinEntity,
  HabitEntity,
  MomentEntity,
} from "../../domain/entities";
import { DataV2Store } from "./store";

const stores: DataV2Store[] = [];

function moment(version: number, content = `version-${version}`): MomentEntity {
  return {
    userId: "user-1",
    clientId: "moment-1",
    version,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: `2026-07-10T00:0${version}:00.000Z`,
    content,
    occurredOn: "2026-07-10",
    imagePath: null,
  };
}

function habit(version = 0): HabitEntity {
  const now = "2026-07-10T00:00:00.000Z";
  return {
    userId: "user-1",
    clientId: "habit-1",
    version,
    createdAt: now,
    updatedAt: now,
    name: "Read",
    description: null,
    frequency: "daily",
    color: null,
    startedOn: "2026-07-10",
  };
}

function checkin(): HabitCheckinEntity {
  const now = "2026-07-10T00:00:00.000Z";
  return {
    userId: "user-1",
    clientId: "habit-checkin:habit-1:2026-07-10",
    version: 0,
    createdAt: now,
    updatedAt: now,
    habitClientId: "habit-1",
    checkedOn: "2026-07-10",
  };
}

async function enqueueHabitCreate(store: DataV2Store) {
  const entity = habit();
  return store.enqueueMutation({
    userId: "user-1",
    resource: "habits",
    clientId: entity.clientId,
    kind: "create",
    baseVersion: null,
    optimistic: entity,
    changes: {
      name: entity.name,
      description: entity.description,
      frequency: entity.frequency,
      color: entity.color,
      startedOn: entity.startedOn,
    },
  });
}

async function enqueueCheckinCreate(store: DataV2Store) {
  const entity = checkin();
  return store.enqueueMutation({
    userId: "user-1",
    resource: "habit_checkins",
    clientId: entity.clientId,
    kind: "create",
    baseVersion: null,
    optimistic: entity,
    changes: {
      habitClientId: entity.habitClientId,
      checkedOn: entity.checkedOn,
    },
  });
}

function createStore(now?: () => Date) {
  const store = new DataV2Store({
    databaseName: `data-v2-test-${crypto.randomUUID()}`,
    now,
  });
  stores.push(store);
  return store;
}

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe("DataV2Store concurrency boundaries", () => {
  it("does not let a stale remote read replace a newer synced snapshot", async () => {
    let now = new Date("2026-07-10T00:02:00.000Z");
    const store = createStore(() => now);
    await store.putSnapshot("moments", moment(2));

    now = new Date("2026-07-10T00:03:00.000Z");
    await store.replaceSnapshots("user-1", "moments", [moment(1)], {
      readStartedAt: "2026-07-10T00:01:00.000Z",
    });

    await expect(store.readCollection("user-1", "moments")).resolves.toEqual([
      expect.objectContaining({ version: 2, content: "version-2" }),
    ]);
  });

  it("does not let an older mutation completion or conflict downgrade a snapshot", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const completed = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "local-v2" },
      optimistic: moment(1, "local-v2"),
    });
    await store.claimMutation(completed!.mutationId);
    await store.putSnapshot("moments", moment(3));
    await store.completeMutation(completed!.mutationId, moment(2));

    await expect(store.readCollection("user-1", "moments")).resolves.toEqual([
      expect.objectContaining({ version: 3 }),
    ]);

    const conflicted = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 3,
      changes: { content: "draft" },
      optimistic: moment(3, "draft"),
    });
    await store.claimMutation(conflicted!.mutationId);
    await store.recordConflict(conflicted!.mutationId, moment(2), "stale");
    await store.discardMutation(conflicted!.mutationId);

    await expect(store.readCollection("user-1", "moments")).resolves.toEqual([
      expect.objectContaining({ version: 3 }),
    ]);
  });

  it("rebases a mutation created from a stale query cache after local completion", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const first = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "first" },
      optimistic: moment(1, "first"),
    });
    await store.claimMutation(first!.mutationId);
    await store.completeMutation(first!.mutationId, moment(2, "first"));

    const second = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "second" },
      optimistic: moment(1, "second"),
    });

    expect(second).toMatchObject({
      baseVersion: 2,
      optimistic: { version: 2, content: "second" },
    });
  });

  it("rejects a remote result for a different entity", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const mutation = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "local" },
      optimistic: moment(1, "local"),
    });
    await store.claimMutation(mutation!.mutationId);

    await expect(
      store.completeMutation(mutation!.mutationId, {
        ...moment(2),
        clientId: "other-moment",
      }),
    ).rejects.toThrow("identity");
    await expect(store.listPendingMutations("user-1")).resolves.toHaveLength(1);
  });

  it("preserves a snapshot created after a remote read that did not see it", async () => {
    const store = createStore(() => new Date("2026-07-10T00:02:00.000Z"));
    await store.putSnapshot("moments", moment(1));

    await store.replaceSnapshots("user-1", "moments", [], {
      readStartedAt: "2026-07-10T00:01:00.000Z",
    });

    await expect(
      store.readCollection("user-1", "moments"),
    ).resolves.toHaveLength(1);
  });

  it("ignores late snapshot writes and mutations after logout cleanup", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    await store.clearUser("user-1");

    await store.putSnapshot("moments", moment(2));
    await store.replaceSnapshots("user-1", "moments", [moment(3)]);

    await expect(store.readCollection("user-1", "moments")).resolves.toEqual(
      [],
    );
    await expect(
      store.enqueueMutation({
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 1,
        changes: { content: "late delete callback" },
        optimistic: moment(1, "late delete callback"),
      }),
    ).rejects.toThrow("signed-out user");
  });

  it("raises the logout barrier before IndexedDB cleanup finishes", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));

    const cleanup = store.clearUser("user-1");
    const lateSnapshot = store.putSnapshot("moments", moment(2));
    const lateMutation = store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "late callback" },
      optimistic: moment(1, "late callback"),
    });

    await expect(lateMutation).rejects.toThrow("signed-out user");
    await Promise.all([cleanup, lateSnapshot]);
    await expect(store.readCollection("user-1", "moments")).resolves.toEqual(
      [],
    );
  });

  it("starts a new local generation when the same user signs in again", async () => {
    const store = createStore();
    store.beginUserSession("user-1");
    const signedOutToken = store.getUserSessionToken("user-1");
    await store.putSnapshot("moments", moment(1), {
      sessionToken: signedOutToken,
    });
    await store.clearUser("user-1");
    store.beginUserSession("user-1");

    await store.putSnapshot("moments", moment(2), {
      sessionToken: signedOutToken,
    });
    await expect(store.readCollection("user-1", "moments")).resolves.toEqual(
      [],
    );

    await store.putSnapshot("moments", moment(3), {
      sessionToken: store.getUserSessionToken("user-1"),
    });
    await expect(store.readCollection("user-1", "moments")).resolves.toEqual([
      expect.objectContaining({ version: 3 }),
    ]);
    await expect(
      store.enqueueMutation({
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 3,
        changes: { content: "new session" },
        optimistic: moment(3, "new session"),
      }),
    ).resolves.toEqual(expect.objectContaining({ sessionToken: 3 }));
  });

  it("deletes the cached snapshot when a completed mutation has no remote", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const mutation = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "delete",
      baseVersion: 1,
      changes: null,
      optimistic: moment(1),
    });

    await store.completeMutation(mutation!.mutationId, null);

    await expect(
      store.readOverlayCollection("user-1", "moments"),
    ).resolves.toEqual([]);
  });

  it("removes a stale snapshot when a conflict reports remote deletion", async () => {
    const store = createStore();
    await store.putSnapshot("moments", moment(1));
    const mutation = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "local draft" },
      optimistic: moment(1, "local draft"),
    });
    await store.recordConflict(mutation!.mutationId, null, "remote deleted");

    await expect(
      store.readOverlayCollection("user-1", "moments"),
    ).resolves.toEqual([
      expect.objectContaining({
        entity: expect.objectContaining({ content: "local draft" }),
        sync: expect.objectContaining({ status: "conflict" }),
      }),
    ]);
    await store.discardMutation(mutation!.mutationId);
    await expect(
      store.readOverlayCollection("user-1", "moments"),
    ).resolves.toEqual([]);
  });

  it("discards queued successors and does not schedule them behind a blocker", async () => {
    let now = Date.parse("2026-07-10T00:00:00.000Z");
    const store = createStore(() => new Date(now++));
    await store.putSnapshot("moments", moment(1));
    const first = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "first" },
      optimistic: moment(1, "first"),
    });
    await store.claimMutation(first!.mutationId);
    await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      changes: { content: "successor" },
      optimistic: moment(1, "successor"),
    });
    await store.recordConflict(
      first!.mutationId,
      moment(2, "remote"),
      "conflict",
    );

    await expect(store.getNextQueuedAt("user-1")).resolves.toBeNull();
    await expect(
      store.enqueueMutation({
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 2,
        changes: { content: "third" },
        optimistic: moment(2, "third"),
      }),
    ).rejects.toThrow("existing sync issue");

    await store.discardMutation(first!.mutationId);
    await expect(store.listPendingMutations("user-1")).resolves.toEqual([]);
  });

  it("can cancel an offline habit and its dependent check-in without an orphan", async () => {
    const store = createStore();
    const habitEntity = habit();
    const checkinEntity = checkin();
    await enqueueHabitCreate(store);
    await enqueueCheckinCreate(store);

    await store.enqueueMutation({
      userId: "user-1",
      resource: "habit_checkins",
      clientId: checkinEntity.clientId,
      kind: "delete",
      baseVersion: 0,
      optimistic: checkinEntity,
    });
    await store.enqueueMutation({
      userId: "user-1",
      resource: "habits",
      clientId: habitEntity.clientId,
      kind: "delete",
      baseVersion: 0,
      optimistic: habitEntity,
    });

    await expect(store.listPendingMutations("user-1")).resolves.toEqual([]);
  });

  it("does not run or claim a check-in before its offline habit exists remotely", async () => {
    const store = createStore();
    const parent = await enqueueHabitCreate(store);
    const child = await enqueueCheckinCreate(store);

    await expect(
      store.listRunnableMutations("user-1", "9999-12-31T23:59:59.999Z"),
    ).resolves.toEqual([
      expect.objectContaining({ mutationId: parent!.mutationId }),
    ]);
    await expect(store.claimMutation(child!.mutationId)).resolves.toBeNull();

    await store.claimMutation(parent!.mutationId);
    await store.completeMutation(parent!.mutationId, habit(1));
    await expect(
      store.listRunnableMutations("user-1", "9999-12-31T23:59:59.999Z"),
    ).resolves.toEqual([
      expect.objectContaining({ mutationId: child!.mutationId }),
    ]);
  });

  it("discards check-ins that depend on a discarded offline habit", async () => {
    const store = createStore();
    const parent = await enqueueHabitCreate(store);
    await enqueueCheckinCreate(store);

    await store.discardMutation(parent!.mutationId);

    await expect(store.listPendingMutations("user-1")).resolves.toEqual([]);
  });
});
