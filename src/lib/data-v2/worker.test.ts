import { describe, expect, it, vi } from "vitest";
import type { DataV2StoreApi } from "./store";
import type { AnyMutationRecord, RemoteMutationExecutor } from "./types";
import {
  calculateRetryDelay,
  DataSyncWorker,
  type SyncEnvironment,
} from "./worker";

const moment = {
  userId: "user-1",
  clientId: "moment-1",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  content: "local",
  occurredOn: "2026-01-01",
  imagePath: null,
};

function queuedMutation(): AnyMutationRecord {
  return {
    mutationId: "mutation-1",
    userId: "user-1",
    resource: "moments",
    clientId: "moment-1",
    kind: "patch",
    baseVersion: 1,
    changes: { content: "local" },
    optimistic: moment,
    status: "queued",
    attemptCount: 42,
    nextAttemptAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function harness(
  result: Awaited<ReturnType<RemoteMutationExecutor["execute"]>>,
) {
  const candidate = queuedMutation();
  const store = {
    recoverSending: vi.fn(async () => 1),
    listRunnableMutations: vi
      .fn()
      .mockResolvedValueOnce([candidate])
      .mockResolvedValue([]),
    claimMutation: vi.fn(async () => ({
      ...candidate,
      status: "sending",
      attemptCount: candidate.attemptCount + 1,
    })),
    getMutationBlobs: vi.fn(async () => []),
    completeMutation: vi.fn(async () => undefined),
    requeueTransient: vi.fn(async () => undefined),
    blockMutation: vi.fn(async () => undefined),
    recordConflict: vi.fn(async () => undefined),
    resumeAuthBlocked: vi.fn(async () => 1),
    getNextQueuedAt: vi.fn(async () => null),
  } as unknown as DataV2StoreApi;
  const execute = vi.fn(async () => result);
  const executor = { execute } as unknown as RemoteMutationExecutor;
  const environment: SyncEnvironment = {
    now: () => new Date("2026-01-01T00:00:00.000Z"),
    random: () => 0.5,
    isOnline: () => true,
    isVisible: () => true,
    setTimer: vi.fn((callback) => setTimeout(callback, 0)),
    clearTimer: vi.fn((timer) => clearTimeout(timer)),
    onOnline: () => () => undefined,
    onVisibilityChange: () => () => undefined,
    locks: {
      request: async (_name, _options, callback) => callback({}),
    },
  };
  const worker = new DataSyncWorker({
    userId: "user-1",
    store,
    executor,
    environment,
  });
  return { worker, store, execute };
}

describe("DataSyncWorker", () => {
  it("requeues transient failures indefinitely instead of dead-lettering", async () => {
    const { worker, store } = harness({ kind: "transient", error: "offline" });
    worker.start();
    await worker.requestFlush();
    expect(store.requeueTransient).toHaveBeenCalledWith(
      "mutation-1",
      "offline",
      expect.any(String),
    );
    expect(store.blockMutation).not.toHaveBeenCalled();
    worker.stop();
  });

  it("pauses on auth and resumes blocked mutations explicitly", async () => {
    const { worker, store } = harness({ kind: "auth", error: "expired" });
    worker.start();
    await worker.requestFlush();
    expect(worker.isAuthPaused).toBe(true);
    expect(store.blockMutation).toHaveBeenCalledWith(
      "mutation-1",
      "auth",
      "expired",
    );
    await worker.resumeAfterAuth();
    expect(store.resumeAuthBlocked).toHaveBeenCalledWith("user-1");
    worker.stop();
  });

  it("persists the local draft on a CAS conflict", async () => {
    const { worker, store } = harness({
      kind: "conflict",
      remote: { ...moment, version: 2, content: "remote" },
      reason: "version mismatch",
    });
    worker.start();
    await worker.requestFlush();
    expect(store.recordConflict).toHaveBeenCalledWith(
      "mutation-1",
      expect.objectContaining({ version: 2 }),
      "version mismatch",
    );
    expect(store.completeMutation).not.toHaveBeenCalled();
    worker.stop();
  });

  it("caps exponential delay without a maximum attempt count", () => {
    expect(calculateRetryDelay(100, { random: 0.5 })).toBe(30 * 60 * 1000);
  });
});
