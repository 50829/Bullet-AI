import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: {
    userId: "user-1" as string | null,
    syncStatus: "idle",
    deadOutboxCount: 0,
    retrySync: vi.fn(),
  },
  goalsController: {
    goals: [{ id: 1, title: "Goal" }],
    loading: false,
    refreshGoals: vi.fn(),
    addGoal: vi.fn(),
    updateGoal: vi.fn(),
    reorderGoals: vi.fn(),
    deleteGoal: vi.fn(),
  },
  habitsController: {
    habits: [{ id: 2, name: "Habit" }],
    loading: false,
    saving: false,
    error: null,
    refresh: vi.fn(),
    createHabit: vi.fn(),
    updateHabit: vi.fn(),
    removeHabit: vi.fn(),
    toggleCheckin: vi.fn(),
    checkinToday: vi.fn(),
  },
  momentsController: {
    moments: [{ id: 3, content: "Moment" }],
    loading: false,
    refreshMoments: vi.fn(),
    addMoment: vi.fn(),
    updateMoment: vi.fn(),
    deleteMoment: vi.fn(),
  },
  reflectionsController: {
    reflections: [{ id: 4, content: "Reflection" }],
    loading: false,
    refreshReflections: vi.fn(),
    addReflection: vi.fn(),
    updateReflection: vi.fn(),
    deleteReflection: vi.fn(),
  },
  useGoals: vi.fn(),
  useHabits: vi.fn(),
  useMoments: vi.fn(),
  useReflections: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

vi.mock("../WorkspaceContext", () => ({
  useWorkspaceSessionContext: vi.fn(() => mocks.session),
}));

vi.mock("../../goals/hooks/useGoals", () => ({
  useGoals: mocks.useGoals,
}));

vi.mock("../../habits/hooks/useHabits", () => ({
  useHabits: mocks.useHabits,
}));

vi.mock("../../moments/hooks/useMoments", () => ({
  useMoments: mocks.useMoments,
}));

vi.mock("../../reflections/hooks/useReflections", () => ({
  useReflections: mocks.useReflections,
}));

const { WorkspaceDataProvider, useWorkspaceData } =
  await import("./WorkspaceDataContext");

describe("WorkspaceDataProvider", () => {
  beforeEach(() => {
    mocks.session.userId = "user-1";
    mocks.useGoals.mockReset();
    mocks.useHabits.mockReset();
    mocks.useMoments.mockReset();
    mocks.useReflections.mockReset();
    mocks.usePathname.mockReset();
    mocks.usePathname.mockReturnValue("/home");
    mocks.useGoals.mockReturnValue(mocks.goalsController);
    mocks.useHabits.mockReturnValue(mocks.habitsController);
    mocks.useMoments.mockReturnValue(mocks.momentsController);
    mocks.useReflections.mockReturnValue(mocks.reflectionsController);
  });

  it("exposes the four workspace controllers to consumers", () => {
    let captured: ReturnType<typeof useWorkspaceData> | null = null;

    function Consumer() {
      captured = useWorkspaceData();
      return createElement("span", null, captured.session.userId);
    }

    const html = renderToString(
      createElement(WorkspaceDataProvider, null, createElement(Consumer)),
    );

    expect(html).toContain("user-1");
    expect(captured?.goals).toBe(mocks.goalsController);
    expect(captured?.habits).toBe(mocks.habitsController);
    expect(captured?.moments).toBe(mocks.momentsController);
    expect(captured?.reflections).toBe(mocks.reflectionsController);
  });

  it("passes a null user id through without throwing", () => {
    mocks.session.userId = null;

    function Consumer() {
      const data = useWorkspaceData();
      return createElement("span", null, data.session.userId ?? "anonymous");
    }

    expect(() =>
      renderToString(
        createElement(WorkspaceDataProvider, null, createElement(Consumer)),
      ),
    ).not.toThrow();
    expect(mocks.useGoals).toHaveBeenCalledWith({ userId: null });
    expect(mocks.useHabits).toHaveBeenCalledWith({ userId: null });
    expect(mocks.useMoments).toHaveBeenCalledWith({
      userId: null,
      remotePageSize: 0,
    });
    expect(mocks.useReflections).toHaveBeenCalledWith({
      userId: null,
      remotePageSize: 0,
    });
  });

  it("enables paged remote reads only for the active collection page", () => {
    mocks.usePathname.mockReturnValue("/moments");

    function Consumer() {
      const data = useWorkspaceData();
      return createElement("span", null, data.session.userId ?? "anonymous");
    }

    renderToString(
      createElement(WorkspaceDataProvider, null, createElement(Consumer)),
    );

    expect(mocks.useMoments).toHaveBeenCalledWith({
      userId: "user-1",
      remotePageSize: 20,
    });
    expect(mocks.useReflections).toHaveBeenCalledWith({
      userId: "user-1",
      remotePageSize: 0,
    });
  });
});
