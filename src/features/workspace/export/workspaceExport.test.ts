import { beforeEach, describe, expect, it, vi } from "vitest";

type TestRecord = {
  id: number;
  client_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  content?: string;
  title?: string;
  name?: string;
  description?: string | null;
  frequency?: "daily" | "weekly";
  color?: string | null;
  habit_id?: number | null;
  habit_client_id?: string;
  checked_on?: string;
  checked?: boolean;
  _local?: {
    pending?: boolean;
    failed?: boolean;
  };
};

const mocks = vi.hoisted(() => ({
  localRows: new Map<string, TestRecord[]>(),
  remoteRows: new Map<string, TestRecord[]>(),
  remoteFailures: new Set<string>(),
}));

vi.mock("../../../lib/localDb/collectionRepository", () => ({
  getCollectionRepository: vi.fn((collection: string) => ({
    list: vi.fn(async () => mocks.localRows.get(collection) ?? []),
  })),
}));

vi.mock("../../../lib/localDb/remoteReader", () => ({
  readRemoteCollection: vi.fn(async (_userId: string, collection: string) => {
    if (mocks.remoteFailures.has(collection)) {
      throw new Error("remote unavailable");
    }
    return mocks.remoteRows.get(collection) ?? [];
  }),
}));

const {
  buildWorkspaceExportPayload,
  loadWorkspaceExportPayload,
  mergeRemoteWithLocalOverrides,
} = await import("./workspaceExport");
const { readRemoteCollection } = await import("../../../lib/localDb/remoteReader");

function row(overrides: Partial<TestRecord>): TestRecord {
  return {
    id: 1,
    client_id: "row-1",
    user_id: "user-1",
    created_at: "2026-07-09T00:00:00.000Z",
    updated_at: "2026-07-09T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("workspaceExport", () => {
  beforeEach(() => {
    mocks.localRows.clear();
    mocks.remoteRows.clear();
    mocks.remoteFailures.clear();
    vi.mocked(readRemoteCollection).mockClear();
  });

  it("builds a payload with exported_at and the four workspace collections", () => {
    const payload = buildWorkspaceExportPayload(
      {
        moments: [row({ id: 1, client_id: "moment-1", content: "Moment" })],
        goals: [row({ id: 2, client_id: "goal-1", title: "Goal" })],
        reflections: [
          row({ id: 3, client_id: "reflection-1", content: "Reflection" }),
        ],
        habits: [
          {
            ...row({ id: 4, client_id: "habit-1", name: "Habit" }),
            frequency: "daily",
            description: null,
            color: null,
            checkedToday: false,
            todayCheckinId: null,
            checkinCount: 0,
            lastCheckedOn: null,
            streak: 0,
            checkins: [],
          },
        ],
      } as never,
      "2026-07-09T00:00:00.000Z",
    );

    expect(payload).toEqual({
      exported_at: "2026-07-09T00:00:00.000Z",
      moments: [expect.objectContaining({ id: 1, content: "Moment" })],
      goals: [expect.objectContaining({ id: 2, title: "Goal" })],
      reflections: [
        expect.objectContaining({ id: 3, content: "Reflection" }),
      ],
      habits: [expect.objectContaining({ id: 4, name: "Habit" })],
    });
  });

  it("merges full remote rows with pending local overrides by client id", () => {
    const remoteOld = row({
      id: 1,
      client_id: "moment-1",
      content: "remote old",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const remoteOther = row({
      id: 2,
      client_id: "moment-2",
      content: "remote other",
      created_at: "2026-07-07T00:00:00.000Z",
    });
    const pendingUpdate = row({
      id: 1,
      client_id: "moment-1",
      content: "pending update",
      created_at: "2026-07-08T00:00:00.000Z",
      _local: { pending: true },
    });
    const staleCached = row({
      id: 3,
      client_id: "moment-stale",
      content: "stale cached",
      created_at: "2026-07-10T00:00:00.000Z",
    });

    expect(
      mergeRemoteWithLocalOverrides(
        [remoteOld, remoteOther] as never,
        [pendingUpdate, staleCached] as never,
      ),
    ).toEqual([
      expect.objectContaining({ content: "pending update" }),
      expect.objectContaining({ content: "remote other" }),
    ]);
  });

  it("loads all export collections from remote and projects habits with checkins", async () => {
    mocks.remoteRows.set("moments", [
      row({ id: 1, client_id: "moment-1", content: "old remote moment" }),
      row({ id: 2, client_id: "moment-2", content: "full remote moment" }),
    ]);
    mocks.localRows.set("moments", [
      row({
        id: 1,
        client_id: "moment-1",
        content: "pending local moment",
        _local: { pending: true },
      }),
    ]);
    mocks.remoteRows.set("goals", [
      row({ id: 3, client_id: "goal-1", title: "Goal", description: "" }),
    ]);
    mocks.remoteRows.set("reflections", [
      row({ id: 4, client_id: "reflection-1", content: "Reflection" }),
    ]);
    mocks.remoteRows.set("habits", [
      row({
        id: 5,
        client_id: "habit-1",
        name: "Habit",
        description: null,
        frequency: "daily",
        color: null,
      }),
    ]);
    mocks.remoteRows.set("habit_checkins", [
      row({
        id: 6,
        client_id: "checkin-1",
        habit_client_id: "habit-1",
        habit_id: 5,
        checked_on: "2026-07-09",
        checked: true,
      }),
    ]);

    const payload = await loadWorkspaceExportPayload(
      "user-1",
      "2026-07-09T00:00:00.000Z",
    );

    expect(readRemoteCollection).toHaveBeenCalledWith("user-1", "moments");
    expect(readRemoteCollection).toHaveBeenCalledWith("user-1", "reflections");
    expect(payload.moments).toEqual([
      expect.objectContaining({ content: "pending local moment" }),
      expect.objectContaining({ content: "full remote moment" }),
    ]);
    expect(payload.habits).toEqual([
      expect.objectContaining({
        name: "Habit",
        checkinCount: 1,
        checkins: [expect.objectContaining({ checked_on: "2026-07-09" })],
      }),
    ]);
  });

  it("fails instead of exporting a partial local cache when remote cannot be read", async () => {
    mocks.remoteFailures.add("moments");
    mocks.localRows.set("moments", [
      row({ id: 1, client_id: "moment-1", content: "cached moment" }),
    ]);

    await expect(
      loadWorkspaceExportPayload("user-1", "2026-07-09T00:00:00.000Z"),
    ).rejects.toThrow("remote unavailable");
  });
});
