import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { userId: "user-1" as string | null },
  goalsController: { goals: [{ clientId: "goal-1" }] },
  habitsController: { habits: [{ clientId: "habit-1" }] },
  momentsController: { moments: [{ clientId: "moment-1" }] },
  reflectionsController: { reflections: [{ clientId: "reflection-1" }] },
  useGoals: vi.fn(),
  useHabits: vi.fn(),
  useMoments: vi.fn(),
  useReflections: vi.fn(),
}));

vi.mock("../WorkspaceContext", () => ({
  useWorkspaceSessionContext: vi.fn(() => mocks.session),
}));
vi.mock("../../goals/hooks/useGoals", () => ({ useGoals: mocks.useGoals }));
vi.mock("../../habits/hooks/useHabits", () => ({ useHabits: mocks.useHabits }));
vi.mock("../../moments/hooks/useMoments", () => ({
  useMoments: mocks.useMoments,
}));
vi.mock("../../reflections/hooks/useReflections", () => ({
  useReflections: mocks.useReflections,
}));

const {
  WorkspaceGoalsProvider,
  WorkspaceHabitsProvider,
  WorkspaceMomentsProvider,
  WorkspaceReflectionsProvider,
  useWorkspaceGoals,
  useWorkspaceHabits,
  useWorkspaceMoments,
  useWorkspaceReflections,
} = await import("./WorkspaceResourceProviders");

describe("route-scoped workspace data providers", () => {
  beforeEach(() => {
    mocks.session.userId = "user-1";
    mocks.useGoals.mockReset().mockReturnValue(mocks.goalsController);
    mocks.useHabits.mockReset().mockReturnValue(mocks.habitsController);
    mocks.useMoments.mockReset().mockReturnValue(mocks.momentsController);
    mocks.useReflections
      .mockReset()
      .mockReturnValue(mocks.reflectionsController);
  });

  it("mounts only the domain controllers explicitly composed by a route", () => {
    function Consumer() {
      const goals = useWorkspaceGoals();
      const habits = useWorkspaceHabits();
      return createElement(
        "span",
        null,
        `${goals.goals[0].clientId}:${habits.habits[0].clientId}`,
      );
    }

    const html = renderToString(
      createElement(
        WorkspaceGoalsProvider,
        null,
        createElement(WorkspaceHabitsProvider, null, createElement(Consumer)),
      ),
    );

    expect(html).toContain("goal-1:habit-1");
    expect(mocks.useGoals).toHaveBeenCalledWith({ userId: "user-1" });
    expect(mocks.useHabits).toHaveBeenCalledWith({ userId: "user-1" });
    expect(mocks.useMoments).not.toHaveBeenCalled();
    expect(mocks.useReflections).not.toHaveBeenCalled();
  });

  it("makes full-history behavior an explicit route-level choice", () => {
    function Consumer() {
      const moments = useWorkspaceMoments();
      const reflections = useWorkspaceReflections();
      return createElement(
        "span",
        null,
        `${moments.moments[0].clientId}:${reflections.reflections[0].clientId}`,
      );
    }

    renderToString(
      createElement(
        WorkspaceMomentsProvider,
        { fullHistory: true },
        createElement(
          WorkspaceReflectionsProvider,
          { fullHistory: true },
          createElement(Consumer),
        ),
      ),
    );

    expect(mocks.useMoments).toHaveBeenCalledWith({
      userId: "user-1",
      fullHistory: true,
    });
    expect(mocks.useReflections).toHaveBeenCalledWith({
      userId: "user-1",
      fullHistory: true,
    });
  });

  it("passes a null session through without pathname-derived behavior", () => {
    mocks.session.userId = null;
    function Consumer() {
      useWorkspaceGoals();
      return createElement("span", null, "anonymous");
    }

    expect(() =>
      renderToString(
        createElement(WorkspaceGoalsProvider, null, createElement(Consumer)),
      ),
    ).not.toThrow();
    expect(mocks.useGoals).toHaveBeenCalledWith({ userId: null });
  });
});
