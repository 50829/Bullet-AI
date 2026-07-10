import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type {
  HabitCheckinEntity,
  HabitEntity,
  MomentEntity,
} from "../../domain/entities";
import { DataDatabase } from "./database";
import { DataStore } from "./store";
import type { AnyMutationRecord } from "./types";

const stores: DataStore[] = [];

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

async function enqueueHabitCreate(store: DataStore) {
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

async function enqueueCheckinCreate(store: DataStore) {
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

function createStore(now?: () => Date, databaseName?: string) {
  const store = new DataStore({
    databaseName: databaseName ?? `data-v2-test-${crypto.randomUUID()}`,
    now,
  });
  stores.push(store);
  return store;
}

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe("DataStore incremental remote cursor", () => {
  it("commits a baseline and later upsert/delete delta with its cursor", async () => {
    const store = createStore();
    store.beginUserSession("user-1");
    await store.replaceSnapshots(
      "user-1",
      "moments",
      [moment(1), { ...moment(1), clientId: "moment-deleted" }],
      { remoteCursor: "10" },
    );

    await expect(store.getRemoteCursor("user-1", "moments")).resolves.toBe(
      "10",
    );

    await store.applyRemoteDelta("user-1", "moments", {
      upserts: [moment(2, "changed incrementally")],
      deletedClientIds: ["moment-deleted"],
      remoteCursor: "12",
    });

    await expect(store.getRemoteCursor("user-1", "moments")).resolves.toBe(
      "12",
    );
    await expect(store.readCollection("user-1", "moments")).resolves.toEqual([
      expect.objectContaining({
        clientId: "moment-1",
        version: 2,
        content: "changed incrementally",
      }),
    ]);
  });

  it("does not let a stale delta remove or downgrade a newer snapshot", async () => {
    const store = createStore(() => new Date("2026-07-10T00:03:00.000Z"));
    store.beginUserSession("user-1");
    await store.putSnapshot("moments", moment(3));

    await store.applyRemoteDelta("user-1", "moments", {
      upserts: [moment(2)],
      deletedClientIds: ["moment-1"],
      remoteCursor: "20",
    });

    await expect(store.readCollection("user-1", "moments")).resolves.toEqual([
      expect.objectContaining({ version: 3 }),
    ]);
    await expect(store.getRemoteCursor("user-1", "moments")).resolves.toBe(
      "20",
    );
  });

  it("preserves a cursor when a non-incremental cache refresh omits one", async () => {
    const store = createStore();
    store.beginUserSession("user-1");
    await store.replaceSnapshots("user-1", "moments", [moment(1)], {
      remoteCursor: "30",
    });
    await store.replaceSnapshots("user-1", "moments", [moment(2)]);

    await expect(store.getRemoteCursor("user-1", "moments")).resolves.toBe(
      "30",
    );
  });

  it("does not let a late tab apply any stale page or move the cursor backwards", async () => {
    const databaseName = `data-v2-test-${crypto.randomUUID()}`;
    const firstTab = createStore(undefined, databaseName);
    const lateTab = createStore(undefined, databaseName);
    firstTab.beginUserSession("user-1");
    lateTab.beginUserSession("user-1");

    await firstTab.replaceSnapshots("user-1", "moments", [moment(2)], {
      remoteCursor: "90071992547409930",
    });
    await lateTab.applyRemoteDelta("user-1", "moments", {
      upserts: [],
      deletedClientIds: ["moment-1"],
      remoteCursor: "90071992547409929",
    });
    await lateTab.applyRemoteDelta("user-1", "moments", {
      upserts: [],
      deletedClientIds: ["moment-1"],
      remoteCursor: "90071992547409930",
    });

    await expect(lateTab.getRemoteCursor("user-1", "moments")).resolves.toBe(
      "90071992547409930",
    );
    await expect(firstTab.readCollection("user-1", "moments")).resolves.toEqual(
      [expect.objectContaining({ version: 2 })],
    );
  });

  it("treats a cursor baseline as authoritative and ignores a late older baseline", async () => {
    const databaseName = `data-v2-baseline-test-${crypto.randomUUID()}`;
    const currentTab = createStore(undefined, databaseName);
    const lateTab = createStore(undefined, databaseName);
    currentTab.beginUserSession("user-1");
    lateTab.beginUserSession("user-1");

    await currentTab.replaceSnapshots("user-1", "moments", [moment(5)], {
      remoteCursor: "10",
    });
    await currentTab.replaceSnapshots("user-1", "moments", [moment(1)], {
      remoteCursor: "20",
    });
    await lateTab.replaceSnapshots("user-1", "moments", [], {
      remoteCursor: "15",
    });
    await lateTab.replaceSnapshots("user-1", "moments", [], {
      remoteCursor: "20",
    });

    await expect(currentTab.getRemoteCursor("user-1", "moments")).resolves.toBe(
      "20",
    );
    await expect(
      currentTab.readCollection("user-1", "moments"),
    ).resolves.toEqual([expect.objectContaining({ version: 1 })]);
  });

  it("accepts a lower version after delete and recreate resets the incarnation", async () => {
    const store = createStore();
    store.beginUserSession("user-1");
    await store.replaceSnapshots("user-1", "moments", [moment(5)], {
      remoteCursor: "30",
    });

    await store.applyRemoteDelta("user-1", "moments", {
      upserts: [moment(1, "recreated")],
      deletedClientIds: [],
      resetClientIds: ["moment-1"],
      remoteCursor: "32",
    });

    await expect(store.getRemoteCursor("user-1", "moments")).resolves.toBe(
      "32",
    );
    await expect(store.readCollection("user-1", "moments")).resolves.toEqual([
      expect.objectContaining({ version: 1, content: "recreated" }),
    ]);
  });
});

describe("DataStore concurrency boundaries", () => {
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

  it("preserves a new tab generation that starts before old cleanup finishes", async () => {
    const databaseName = `data-v2-fast-relogin-${crypto.randomUUID()}`;
    const signingOutTab = createStore(undefined, databaseName);
    const signingInTab = createStore(undefined, databaseName);
    signingOutTab.beginUserSession("user-1");
    signingInTab.beginUserSession("user-1");
    await signingOutTab.putSnapshot("moments", moment(1, "old session"));

    const cleanup = signingOutTab.clearUser("user-1");
    signingInTab.beginUserSession("user-1");
    const newWrite = signingInTab.putSnapshot(
      "moments",
      moment(2, "new session"),
    );

    await Promise.all([cleanup, newWrite]);
    await expect(
      signingInTab.readCollection("user-1", "moments"),
    ).resolves.toEqual([
      expect.objectContaining({ version: 2, content: "new session" }),
    ]);
  });

  it("blocks an old token in another tab as soon as logout begins", async () => {
    const databaseName = `data-v2-cross-tab-logout-${crypto.randomUUID()}`;
    const signingOutTab = createStore(undefined, databaseName);
    const staleTab = createStore(undefined, databaseName);
    signingOutTab.beginUserSession("user-1");
    staleTab.beginUserSession("user-1");
    const staleToken = staleTab.getUserSessionToken("user-1");
    await signingOutTab.putSnapshot("moments", moment(1, "old session"));

    const cleanup = signingOutTab.clearUser("user-1");
    const lateWrite = staleTab.putSnapshot(
      "moments",
      moment(2, "late callback"),
      { sessionToken: staleToken },
    );

    await Promise.all([cleanup, lateWrite]);
    await expect(staleTab.readCollection("user-1", "moments")).resolves.toEqual(
      [],
    );
  });

  it("keeps the newest cleanup barrier when two tabs sign out together", async () => {
    const databaseName = `data-v2-overlapping-logout-${crypto.randomUUID()}`;
    const firstTab = createStore(undefined, databaseName);
    const secondTab = createStore(undefined, databaseName);
    const returningTab = createStore(undefined, databaseName);
    firstTab.beginUserSession("user-1");
    secondTab.beginUserSession("user-1");
    await firstTab.putSnapshot("moments", moment(1, "old session"));

    const firstCleanup = firstTab.clearUser("user-1");
    const secondCleanup = secondTab.clearUser("user-1");
    returningTab.beginUserSession("user-1");
    const newWrite = returningTab.putSnapshot(
      "moments",
      moment(2, "returning session"),
    );

    await Promise.all([firstCleanup, secondCleanup, newWrite]);
    await expect(
      returningTab.readCollection("user-1", "moments"),
    ).resolves.toEqual([
      expect.objectContaining({ version: 2, content: "returning session" }),
    ]);
  });

  it("does not let a late remote completion restore data after logout", async () => {
    const databaseName = `data-v2-logout-test-${crypto.randomUUID()}`;
    const store = createStore(undefined, databaseName);
    store.beginUserSession("user-1");
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

    const cleanup = store.clearUser("user-1");
    const lateCompletion = store.completeMutation(
      mutation!.mutationId,
      moment(2, "late remote result"),
    );
    await Promise.all([cleanup, lateCompletion]);

    const refreshedRuntime = createStore(undefined, databaseName);
    refreshedRuntime.beginUserSession("user-1");
    await expect(
      refreshedRuntime.readCollection("user-1", "moments"),
    ).resolves.toEqual([]);
    await expect(
      refreshedRuntime.listPendingMutations("user-1"),
    ).resolves.toEqual([]);
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
    const mutation = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 3,
      changes: { content: "new session" },
      optimistic: moment(3, "new session"),
    });
    expect(mutation).not.toHaveProperty("sessionToken");
  });

  it("recovers a legacy token > 1 pending mutation after a refresh", async () => {
    const databaseName = `data-v2-refresh-test-${crypto.randomUUID()}`;
    const firstRuntime = createStore(undefined, databaseName);
    firstRuntime.beginUserSession("user-1");
    firstRuntime.beginUserSession("user-1");
    expect(firstRuntime.getUserSessionToken("user-1")).toBe(2);
    const mutation = await firstRuntime.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "create",
      baseVersion: null,
      changes: {
        content: "created offline",
        occurredOn: "2026-07-10",
        imagePath: null,
      },
      optimistic: moment(0, "created offline"),
    });
    const legacyDatabase = new DataDatabase(databaseName);
    const connection = await legacyDatabase.open();
    await connection.put("mutations", {
      ...mutation!,
      // Records written before durable queues were decoupled from runtime
      // sessions can still contain this obsolete field.
      sessionToken: 2,
    } as unknown as AnyMutationRecord);
    await legacyDatabase.close();
    await firstRuntime.close();

    const refreshedRuntime = createStore(undefined, databaseName);
    refreshedRuntime.beginUserSession("user-1");
    expect(refreshedRuntime.getUserSessionToken("user-1")).toBe(1);

    await expect(
      refreshedRuntime.listPendingMutations("user-1"),
    ).resolves.toEqual([
      expect.objectContaining({ mutationId: mutation!.mutationId }),
    ]);
    await expect(
      refreshedRuntime.listRunnableMutations(
        "user-1",
        "2026-07-10T23:59:59.999Z",
      ),
    ).resolves.toEqual([
      expect.objectContaining({ mutationId: mutation!.mutationId }),
    ]);
  });

  it("lets another store instance see and take over a pending mutation", async () => {
    const databaseName = `data-v2-tabs-test-${crypto.randomUUID()}`;
    const firstTab = createStore(undefined, databaseName);
    const secondTab = createStore(undefined, databaseName);
    firstTab.beginUserSession("user-1");
    firstTab.beginUserSession("user-1");
    secondTab.beginUserSession("user-1");
    const mutation = await firstTab.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "create",
      baseVersion: null,
      changes: {
        content: "created in the first tab",
        occurredOn: "2026-07-10",
        imagePath: null,
      },
      optimistic: moment(0, "created in the first tab"),
    });

    await expect(secondTab.listPendingMutations("user-1")).resolves.toEqual([
      expect.objectContaining({ mutationId: mutation!.mutationId }),
    ]);
    const claims = await Promise.all([
      firstTab.claimMutation(mutation!.mutationId),
      secondTab.claimMutation(mutation!.mutationId),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);

    await secondTab.completeMutation(
      mutation!.mutationId,
      moment(1, "synced by the second tab"),
    );
    await expect(firstTab.listPendingMutations("user-1")).resolves.toEqual([]);
    await expect(firstTab.readCollection("user-1", "moments")).resolves.toEqual(
      [expect.objectContaining({ content: "synced by the second tab" })],
    );
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
