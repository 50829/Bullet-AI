// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GoalRecord } from "../types";
import { useGoalPlanningPage } from "./useGoalPlanningPage";

vi.mock("@/shared/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
vi.mock("@/shared/components/ui/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock("../hooks/useCompletedGoalRetention", () => ({
  useCompletedGoalRetention: () => "never",
}));

afterEach(cleanup);

function goal(overrides: Partial<GoalRecord> = {}): GoalRecord {
  return {
    clientId: "goal-1",
    userId: "user-1",
    version: 1,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    title: "Plan",
    description: "",
    dueDate: null,
    completedAt: null,
    color: null,
    sortOrder: 0,
    ...overrides,
  };
}

function controller(goals: GoalRecord[]) {
  return {
    goals,
    loading: false,
    error: null,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
    refreshGoals: vi.fn(),
    createGoal: vi.fn().mockResolvedValue(undefined),
    updateGoal: vi.fn().mockResolvedValue(undefined),
    deleteGoal: vi.fn().mockResolvedValue(undefined),
    toggleGoalCompleted: vi.fn().mockResolvedValue(undefined),
  } as unknown as Parameters<typeof useGoalPlanningPage>[0]["goalsController"];
}

describe("useGoalPlanningPage", () => {
  it("uses the injected controller and schedules its goal for the selected day", async () => {
    const goalsController = controller([goal()]);
    const { result } = renderHook(() =>
      useGoalPlanningPage({ goalsController }),
    );

    act(() => result.current.handleDateSelect(new Date(2026, 6, 10)));
    await act(() =>
      result.current.scheduleGoalForSelectedDate(result.current.goals[0]),
    );

    expect(goalsController.updateGoal).toHaveBeenCalledWith("goal-1", {
      dueDate: "2026-07-10",
    });
    expect(result.current.rightViewMode).toBe("schedule");
  });

  it("filters route-hidden goals before deriving planning buckets", () => {
    const goalsController = controller([
      goal(),
      goal({ clientId: "goal-hidden", title: "Hidden" }),
    ]);
    const { result } = renderHook(() =>
      useGoalPlanningPage({
        goalsController,
        hiddenGoalClientIds: new Set(["goal-hidden"]),
      }),
    );

    expect(result.current.goals.map((item) => item.clientId)).toEqual([
      "goal-1",
    ]);
    expect(
      result.current.unscheduledGoals.map((item) => item.clientId),
    ).toEqual(["goal-1"]);
  });
});
