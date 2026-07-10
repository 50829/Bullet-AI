import { describe, expect, it } from "vitest";
import {
  isGoalCompleted,
  shouldShowGoal,
  sortGoalsByCompletion,
  sortGoalsByOrder,
} from "./goalVisibility";

describe("goalVisibility", () => {
  it("uses completedAt as the only completion state", () => {
    expect(isGoalCompleted({ completedAt: "2026-07-10T08:00:00.000Z" })).toBe(
      true,
    );
    expect(isGoalCompleted({ completedAt: null })).toBe(false);
  });

  it("sorts by explicit order and keeps ties stable", () => {
    const goals = [
      { clientId: "1", sortOrder: 2, createdAt: "2026-01-01T00:00:00.000Z" },
      { clientId: "2", sortOrder: 1, createdAt: "2026-01-02T00:00:00.000Z" },
      { clientId: "3", sortOrder: 1, createdAt: "2026-01-03T00:00:00.000Z" },
    ];

    expect(sortGoalsByOrder(goals).map((goal) => goal.clientId)).toEqual([
      "2",
      "3",
      "1",
    ]);
  });

  it("places completed goals after open goals without changing relative order", () => {
    const goals = [
      { clientId: "1", completedAt: "2026-07-10T08:00:00.000Z" },
      { clientId: "2", completedAt: null },
      { clientId: "3", completedAt: "2026-07-09T08:00:00.000Z" },
    ];

    expect(sortGoalsByCompletion(goals).map((goal) => goal.clientId)).toEqual([
      "2",
      "1",
      "3",
    ]);
  });

  it("applies completed goal retention policies to the completion timestamp", () => {
    const now = new Date(2026, 5, 20, 12);
    const completedToday = {
      completedAt: new Date(2026, 5, 20, 8).toISOString(),
    };
    const completedYesterday = {
      completedAt: new Date(2026, 5, 19, 8).toISOString(),
    };

    expect(shouldShowGoal(completedToday, "next_day", now)).toBe(true);
    expect(shouldShowGoal(completedYesterday, "next_day", now)).toBe(false);
    expect(shouldShowGoal(completedToday, "instant", now)).toBe(false);
    expect(shouldShowGoal(completedYesterday, "never", now)).toBe(true);
    expect(shouldShowGoal({ completedAt: null }, "instant", now)).toBe(true);
  });
});
