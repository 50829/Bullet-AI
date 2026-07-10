// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getDiagnostics = vi.fn();
  const listConflictDetails = vi.fn();
  const discardMutation = vi.fn();
  const retryBlockedMutation = vi.fn();
  const getConflictDetails = vi.fn();
  const requestFlush = vi.fn();
  const subscribe = vi.fn();
  return {
    auth: { userId: "user-1" as string | null, ready: true },
    getDiagnostics,
    listConflictDetails,
    discardMutation,
    retryBlockedMutation,
    getConflictDetails,
    requestFlush,
    subscribe,
    runtime: {
      store: {
        getDiagnostics,
        listConflictDetails,
        discardMutation,
        retryBlockedMutation,
        getConflictDetails,
      },
      worker: { requestFlush },
      notifier: { subscribe },
    },
  };
});

vi.mock("@/lib/auth/AuthSessionContext", () => ({
  useAuthSession: () => mocks.auth,
}));

vi.mock("@/data", () => ({
  useDataRuntime: () => mocks.runtime,
}));

import { useWorkspaceSession } from "./useWorkspaceSession";

afterEach(cleanup);

describe("useWorkspaceSession", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    mocks.auth.userId = "user-1";
    mocks.getDiagnostics.mockReset().mockResolvedValue({
      queued: 1,
      sending: 0,
      blocked: 1,
      conflicts: 0,
      mutations: [
        {
          mutationId: "blocked-1",
          resource: "moments",
          kind: "patch",
          status: "blocked",
          lastError: "invalid payload",
          attemptCount: 2,
          updatedAt: "2026-07-10T08:00:00.000Z",
        },
        {
          mutationId: "queued-1",
          resource: "goals",
          kind: "create",
          status: "queued",
          attemptCount: 0,
          updatedAt: "2026-07-10T08:01:00.000Z",
        },
      ],
    });
    mocks.listConflictDetails.mockReset().mockResolvedValue([]);
    mocks.discardMutation.mockReset().mockResolvedValue(undefined);
    mocks.retryBlockedMutation.mockReset().mockResolvedValue(true);
    mocks.getConflictDetails.mockReset().mockResolvedValue(null);
    mocks.requestFlush.mockReset().mockResolvedValue(undefined);
    mocks.subscribe.mockReset().mockReturnValue(() => undefined);
  });

  it("derives actionable diagnostics from the durable mutation store", async () => {
    const { result } = renderHook(() => useWorkspaceSession());

    await waitFor(() => expect(result.current.pendingCount).toBe(2));
    expect(result.current.syncStatus).toBe("failed");
    expect(result.current.syncIssues).toEqual([
      expect.objectContaining({
        id: "blocked-1",
        resource: "moments",
        status: "blocked",
        error: "invalid payload",
      }),
    ]);
  });

  it("requeues one blocked item, flushes it, and can discard it", async () => {
    const { result } = renderHook(() => useWorkspaceSession());
    await waitFor(() => expect(result.current.pendingCount).toBe(2));

    await act(() => result.current.retrySyncItem("blocked-1"));
    expect(mocks.retryBlockedMutation).toHaveBeenCalledWith("blocked-1");
    expect(mocks.requestFlush).toHaveBeenCalledOnce();

    await act(() => result.current.discardSyncItem("blocked-1"));
    expect(mocks.discardMutation).toHaveBeenCalledWith("blocked-1");
    expect(mocks.getDiagnostics.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("reports offline even when mutations are otherwise syncable", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    const { result } = renderHook(() => useWorkspaceSession());

    await waitFor(() => expect(result.current.pendingCount).toBe(2));
    expect(result.current.syncStatus).toBe("offline");
  });
});
