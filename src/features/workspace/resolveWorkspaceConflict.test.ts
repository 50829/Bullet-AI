import { describe, expect, it, vi } from "vitest";
import type { DataStoreApi, DataSyncControl } from "@/data";
import { resolveWorkspaceConflict } from "./resolveWorkspaceConflict";

describe("resolveWorkspaceConflict", () => {
  it("triggers the worker when a conflict is requeued", async () => {
    const store = {
      getConflictDetails: vi.fn(async () => ({
        mutationId: "mutation-1",
        userId: "user-1",
        resource: "moments" as const,
        clientId: "moment-1",
      })),
      resolveConflict: vi.fn(async () => ({
        mutationId: "mutation-1",
        outcome: "requeued" as const,
      })),
    } as unknown as DataStoreApi;
    const worker = {
      requestFlush: vi.fn(async () => undefined),
    } as unknown as DataSyncControl;
    const loadRemote = vi.fn(async () => null);

    await resolveWorkspaceConflict(
      store,
      worker,
      "mutation-1",
      { action: "keep-local" },
      loadRemote,
    );

    expect(store.resolveConflict).toHaveBeenCalledWith("mutation-1", {
      action: "keep-local",
      remoteOverride: null,
    });
    expect(loadRemote).toHaveBeenCalledWith("user-1", "moments", "moment-1");
    expect(worker.requestFlush).toHaveBeenCalledOnce();
  });

  it("does not flush after accepting cloud because no mutation remains", async () => {
    const store = {
      getConflictDetails: vi.fn(async () => ({
        mutationId: "mutation-1",
        userId: "user-1",
        resource: "moments" as const,
        clientId: "moment-1",
      })),
      resolveConflict: vi.fn(async () => ({
        mutationId: "mutation-1",
        outcome: "accepted-remote" as const,
      })),
    } as unknown as DataStoreApi;
    const worker = {
      requestFlush: vi.fn(async () => undefined),
    } as unknown as DataSyncControl;
    const loadRemote = vi.fn(async () => null);

    await resolveWorkspaceConflict(
      store,
      worker,
      "mutation-1",
      { action: "accept-remote" },
      loadRemote,
    );

    expect(worker.requestFlush).not.toHaveBeenCalled();
  });

  it("does nothing when the conflict was already resolved elsewhere", async () => {
    const store = {
      getConflictDetails: vi.fn(async () => null),
      resolveConflict: vi.fn(),
    } as unknown as DataStoreApi;
    const loadRemote = vi.fn();

    await expect(
      resolveWorkspaceConflict(
        store,
        null,
        "mutation-1",
        { action: "accept-remote" },
        loadRemote,
      ),
    ).resolves.toBeNull();
    expect(loadRemote).not.toHaveBeenCalled();
    expect(store.resolveConflict).not.toHaveBeenCalled();
  });
});
