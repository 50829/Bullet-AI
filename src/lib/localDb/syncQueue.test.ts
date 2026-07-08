import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OutboxItem } from "./types";

const store = vi.hoisted(() => new Map<string, OutboxItem>());

vi.mock("./indexedDb", () => ({
  idbGet: vi.fn(async (_name: string, id: string) => store.get(id)),
  idbGetAll: vi.fn(async () => [...store.values()]),
  idbPut: vi.fn(async (_name: string, item: OutboxItem) => {
    store.set(item.id, item);
    return item.id;
  }),
  idbDelete: vi.fn(async (_name: string, id: string) => {
    store.delete(id);
  }),
}));

const { getOutboxItems, markOutboxItem, recoverStaleOutboxItems } =
  await import("./syncQueue");

function item(overrides: Partial<OutboxItem>): OutboxItem {
  return {
    id: overrides.id ?? "item",
    userId: "user-1",
    collection: "goals",
    entityId: "1",
    operation: "update",
    payload: {},
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sync queue recovery and dependency ordering", () => {
  beforeEach(() => store.clear());

  it("orders a habit before a check-in created at the same time", async () => {
    const checkin = item({ id: "checkin", collection: "habit_checkins" });
    const habit = item({ id: "habit", collection: "habits" });
    store.set(checkin.id, checkin);
    store.set(habit.id, habit);

    expect((await getOutboxItems()).map((entry) => entry.id)).toEqual([
      "habit",
      "checkin",
    ]);
  });

  it("returns an interrupted syncing item to pending", async () => {
    const stale = item({ id: "stale", status: "syncing" });
    store.set(stale.id, stale);

    expect(await recoverStaleOutboxItems(1)).toBe(1);
    expect(store.get("stale")).toMatchObject({
      status: "pending",
      error: "Recovered after an interrupted sync",
    });
  });

  it("does not return dead-lettered items in the default pending queue", async () => {
    const dead = item({ id: "dead", status: "dead" });
    const pending = item({ id: "pending", status: "pending" });
    store.set(dead.id, dead);
    store.set(pending.id, pending);

    expect((await getOutboxItems()).map((entry) => entry.id)).toEqual([
      "pending",
    ]);
  });

  it("moves permanent failures directly to dead-letter state", async () => {
    const failed = item({ id: "permanent" });
    store.set(failed.id, failed);

    await markOutboxItem(failed, "failed", {
      error: "Remote row not found for update",
      errorKind: "not_found",
    });

    expect(store.get("permanent")).toMatchObject({
      status: "dead",
      errorKind: "not_found",
      deadAt: expect.any(String),
    });
  });

  it("moves transient failures to dead-letter state after the retry budget", async () => {
    const failed = item({ id: "retry", attemptCount: 5 });
    store.set(failed.id, failed);

    await markOutboxItem(failed, "failed", {
      error: "network unavailable",
      errorKind: "transient",
    });

    expect(store.get("retry")).toMatchObject({
      status: "dead",
      errorKind: "transient",
      deadAt: expect.any(String),
    });
  });
});
