import { describe, expect, it } from "vitest";
import {
  isGoalCompleted,
  shouldShowGoal,
  sortGoalsByCompletion,
  sortGoalsByOrder,
} from "./goalVisibility";

describe("goalVisibility", () => {
  it("detects completed goals", () => {
    expect(isGoalCompleted({ status: "completed" })).toBe(true);
    expect(isGoalCompleted({ status: "pending" })).toBe(false);
  });

  it("sorts by explicit sort order and then keeps stable order", () => {
    const goals = [
      { id: 1, sort_order: 2, created_at: "2026-01-01T00:00:00.000Z" },
      { id: 2, sort_order: 1, created_at: "2026-01-02T00:00:00.000Z" },
      { id: 3, sort_order: 1, created_at: "2026-01-03T00:00:00.000Z" },
    ];

    expect(sortGoalsByOrder(goals).map((goal) => goal.id)).toEqual([2, 3, 1]);
  });

  it("places completed goals after open goals without changing relative order", () => {
    const goals = [
      { id: 1, status: "completed" },
      { id: 2, status: "pending" },
      { id: 3, status: "completed" },
    ];

    expect(sortGoalsByCompletion(goals).map((goal) => goal.id)).toEqual([
      2, 1, 3,
    ]);
  });

  it("applies completed goal retention policies", () => {
    const now = new Date(2026, 5, 20, 12);
    const completedToday = {
      status: "completed",
      updated_at: new Date(2026, 5, 20, 8).toISOString(),
    };
    const completedYesterday = {
      status: "completed",
      updated_at: new Date(2026, 5, 19, 8).toISOString(),
    };

    expect(shouldShowGoal(completedToday, "next_day", now)).toBe(true);
    expect(shouldShowGoal(completedYesterday, "next_day", now)).toBe(false);
    expect(shouldShowGoal(completedToday, "instant", now)).toBe(false);
    expect(shouldShowGoal(completedYesterday, "never", now)).toBe(true);
    expect(shouldShowGoal({ status: "pending" }, "instant", now)).toBe(true);
  });
});
