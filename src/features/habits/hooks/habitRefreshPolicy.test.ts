import { describe, expect, it } from "vitest";

import {
  HABIT_REFRESH_TTL_MS,
  shouldRefreshHabits,
} from "./habitRefreshPolicy";

describe("shouldRefreshHabits", () => {
  it("refreshes an uninitialized store", () => {
    expect(shouldRefreshHabits(null, 10_000)).toBe(true);
  });

  it("reuses a fresh remote snapshot while navigating", () => {
    expect(shouldRefreshHabits(10_000, 10_000 + HABIT_REFRESH_TTL_MS - 1)).toBe(
      false,
    );
  });

  it("refreshes when the snapshot reaches the freshness limit", () => {
    expect(shouldRefreshHabits(10_000, 10_000 + HABIT_REFRESH_TTL_MS)).toBe(
      true,
    );
  });
});
