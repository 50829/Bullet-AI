import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataV2StoreApi, DataV2SyncControl } from "../data-v2";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock("../supabase/client", () => ({
  supabase: { auth: { signOut: mocks.signOut } },
}));

const { signOutAndClearLocalData } = await import("./logout");

function dependencies() {
  const store = {
    listPendingMutations: vi.fn().mockResolvedValue([{}, {}]),
    clearUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as DataV2StoreApi;
  const worker = {
    requestFlush: vi.fn().mockResolvedValue(undefined),
  } as unknown as DataV2SyncControl;
  return { store, worker };
}

describe("signOutAndClearLocalData", () => {
  beforeEach(() => mocks.signOut.mockReset());

  it("flushes first and clears the user only after auth sign-out succeeds", async () => {
    const { store, worker } = dependencies();
    mocks.signOut.mockResolvedValue({ error: null });

    await expect(
      signOutAndClearLocalData({ userId: "user-1", store, worker }),
    ).resolves.toEqual({ error: null, discardedPendingCount: 2 });

    expect(worker.requestFlush).toHaveBeenCalledOnce();
    expect(store.listPendingMutations).toHaveBeenCalledWith("user-1");
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(store.clearUser).toHaveBeenCalledWith("user-1");
    expect(
      vi.mocked(worker.requestFlush).mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(store.clearUser).mock.invocationCallOrder[0],
    );
  });

  it("keeps local data when auth sign-out fails", async () => {
    const { store, worker } = dependencies();
    const error = new Error("sign-out failed");
    mocks.signOut.mockResolvedValue({ error });

    await expect(
      signOutAndClearLocalData({ userId: "user-1", store, worker }),
    ).resolves.toEqual({ error, discardedPendingCount: 0 });
    expect(store.clearUser).not.toHaveBeenCalled();
  });
});
