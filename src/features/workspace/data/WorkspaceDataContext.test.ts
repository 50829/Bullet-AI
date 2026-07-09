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
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    reorderGoals: vi.fn(),
    deleteGoal: vi.fn(),
  },
  habitsController: {
    habits: [{ id: 2, name: "Habit" }],
    loading: false,
    saving: false,
    error: null,
    refreshHabits: vi.fn(),
    createHabit: vi.fn(),
    updateHabit: vi.fn(),
    deleteHabit: vi.fn(),
    toggleCheckin: vi.fn(),
    checkinToday: vi.fn(),
  },
  momentsController: {
    moments: [{ id: 3, content: "Moment" }],
    loading: false,
    refreshMoments: vi.fn(),
    createMoment: vi.fn(),
    updateMoment: vi.fn(),
    deleteMoment: vi.fn(),
  },
  reflectionsController: {
    reflections: [{ id: 4, content: "Reflection" }],
    loading: false,
    refreshReflections: vi.fn(),
    createReflection: vi.fn(),
    updateReflection: vi.fn(),
    deleteReflection: vi.fn(),
  },
  useGoals: vi.fn(),
  useHabits: vi.fn(),
  useMoments: vi.fn(),
  useReflections: vi.fn(),
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

function expectWorkspaceData(
  value: unknown,
): asserts value is ReturnType<typeof useWorkspaceData> {
  expect(value).not.toBeNull();
}

describe("WorkspaceDataProvider", () => {
  beforeEach(() => {
    mocks.session.userId = "user-1";
    mocks.useGoals.mockReset();
    mocks.useHabits.mockReset();
    mocks.useMoments.mockReset();
    mocks.useReflections.mockReset();
    mocks.useGoals.mockReturnValue(mocks.goalsController);
    mocks.useHabits.mockReturnValue(mocks.habitsController);
    mocks.useMoments.mockReturnValue(mocks.momentsController);
    mocks.useReflections.mockReturnValue(mocks.reflectionsController);
  });

  it("exposes the four workspace controllers to consumers", () => {
    let captured: unknown = null;

    function Consumer() {
      const data = useWorkspaceData();
      captured = data;
      return createElement("span", null, data.session.userId);
    }

    const html = renderToString(
      createElement(WorkspaceDataProvider, null, createElement(Consumer)),
    );

    expect(html).toContain("user-1");
    expectWorkspaceData(captured);
    expect(captured.goals).toBe(mocks.goalsController);
    expect(captured.habits).toBe(mocks.habitsController);
    expect(captured.moments).toBe(mocks.momentsController);
    expect(captured.reflections).toBe(mocks.reflectionsController);
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
    expect(mocks.useGoals).toHaveBeenCalledWith({
      userId: null,
      initialSnapshot: undefined,
    });
    expect(mocks.useHabits).toHaveBeenCalledWith({
      userId: null,
      initialHabitsSnapshot: undefined,
      initialCheckinsSnapshot: undefined,
    });
    expect(mocks.useMoments).toHaveBeenCalledWith({
      userId: null,
      remotePageSize: 0,
      initialSnapshot: undefined,
    });
    expect(mocks.useReflections).toHaveBeenCalledWith({
      userId: null,
      remotePageSize: 0,
      initialSnapshot: undefined,
    });
  });

  it("enables only the requested route collections and passes initial data", () => {
    const initialData = {
      userId: "user-1",
      moments: {
        userId: "user-1",
        items: [
          {
            id: 3,
            client_id: "moment-3",
            content: "Moment",
            created_at: "2026-07-09T00:00:00.000Z",
            updated_at: "2026-07-09T00:00:00.000Z",
          },
        ],
        complete: false,
        hasMore: true,
        nextOffset: 1,
      },
    };

    function Consumer() {
      const data = useWorkspaceData();
      return createElement("span", null, data.session.userId ?? "anonymous");
    }

    renderToString(
      createElement(
        WorkspaceDataProvider,
        {
          enabledCollections: ["moments"],
          initialData,
        },
        createElement(Consumer),
      ),
    );

    expect(mocks.useGoals).toHaveBeenCalledWith({
      userId: null,
      initialSnapshot: undefined,
    });
    expect(mocks.useHabits).toHaveBeenCalledWith({
      userId: null,
      initialHabitsSnapshot: undefined,
      initialCheckinsSnapshot: undefined,
    });
    expect(mocks.useMoments).toHaveBeenCalledWith({
      userId: "user-1",
      remotePageSize: 20,
      initialSnapshot: initialData.moments,
    });
    expect(mocks.useReflections).toHaveBeenCalledWith({
      userId: null,
      remotePageSize: 0,
      initialSnapshot: undefined,
    });
  });
});
