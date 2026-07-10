// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeferredHardDelete } from "./useDeferredHardDelete";

afterEach(cleanup);

describe("useDeferredHardDelete", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("lets the user undo before the hard delete delay expires", () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDeferredHardDelete<string>({ delayMs: 5000, onError: vi.fn() }),
    );

    act(() => result.current.scheduleDelete("moment-1", commit));
    expect(result.current.pendingDelete).toBe("moment-1");
    act(() => result.current.undoDelete());
    act(() => vi.advanceTimersByTime(5000));

    expect(result.current.pendingDelete).toBeNull();
    expect(commit).not.toHaveBeenCalled();
  });

  it("commits the previous delete when a new target replaces it", () => {
    const firstCommit = vi.fn().mockResolvedValue(undefined);
    const secondCommit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDeferredHardDelete<string>({ delayMs: 5000, onError: vi.fn() }),
    );

    act(() => result.current.scheduleDelete("moment-1", firstCommit));
    act(() => result.current.scheduleDelete("moment-2", secondCommit));
    expect(firstCommit).toHaveBeenCalledOnce();
    expect(result.current.pendingDelete).toBe("moment-2");

    act(() => vi.advanceTimersByTime(5000));
    expect(secondCommit).toHaveBeenCalledOnce();
    expect(result.current.pendingDelete).toBeNull();
  });

  it("commits a pending delete when its owner unmounts", () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useDeferredHardDelete<string>({ delayMs: 5000, onError: vi.fn() }),
    );

    act(() => result.current.scheduleDelete("moment-1", commit));
    unmount();
    expect(commit).toHaveBeenCalledOnce();
  });
});
