import { describe, expect, it } from "vitest";
import {
  MAX_GOAL_PLAN_DESCRIPTION_CHARS,
  MAX_GOAL_PLAN_TASKS_PER_GROUP,
  MAX_GOAL_PLAN_TITLE_CHARS,
  parseGoalPlan,
  parseGoalPlanningResponse,
  parseInternalGoalPlan,
} from "./goalPlan";

const task = { title: "第一步", description: "完成一个明确动作" };

describe("goalPlan contract", () => {
  it("normalizes valid internal and frontend plan shapes", () => {
    expect(
      parseInternalGoalPlan({
        tasksDaily: [{ title: "  第一步  ", description: "  先做准备  " }],
        tasksFuture: [],
      }),
    ).toEqual({
      daily: [{ title: "第一步", description: "先做准备" }],
      future: [],
    });

    expect(parseGoalPlan({ daily: [task], future: [] })).toEqual({
      daily: [task],
      future: [],
    });
  });

  it("rejects empty, oversized, and non-exact plans", () => {
    expect(parseGoalPlan({ daily: [], future: [] })).toBeNull();
    expect(parseGoalPlan({ daily: [task] })).toBeNull();
    expect(
      parseGoalPlan({ daily: [task], future: [], extra: true }),
    ).toBeNull();
    expect(
      parseGoalPlan({
        daily: Array.from(
          { length: MAX_GOAL_PLAN_TASKS_PER_GROUP + 1 },
          () => task,
        ),
        future: [],
      }),
    ).toBeNull();
  });

  it("rejects malformed task fields and configured length overflows", () => {
    expect(
      parseGoalPlan({
        daily: [{ ...task, title: "x".repeat(MAX_GOAL_PLAN_TITLE_CHARS + 1) }],
        future: [],
      }),
    ).toBeNull();
    expect(
      parseGoalPlan({
        daily: [
          {
            ...task,
            description: "x".repeat(MAX_GOAL_PLAN_DESCRIPTION_CHARS + 1),
          },
        ],
        future: [],
      }),
    ).toBeNull();
    expect(
      parseGoalPlan({
        daily: [{ ...task, description: "" }],
        future: [],
      }),
    ).toBeNull();
    expect(
      parseGoalPlan({
        daily: [{ ...task, unexpected: true }],
        future: [],
      }),
    ).toBeNull();
  });

  it("validates successful API responses at runtime", () => {
    expect(parseGoalPlanningResponse({ reply: "先从这里开始。" })).toEqual({
      reply: "先从这里开始。",
    });
    expect(
      parseGoalPlanningResponse({
        reply: "",
        plan: { daily: [task], future: [] },
      }),
    ).toEqual({ reply: "", plan: { daily: [task], future: [] } });

    expect(parseGoalPlanningResponse({ reply: "", plan: null })).toBeNull();
    expect(parseGoalPlanningResponse({ reply: "" })).toBeNull();
    expect(
      parseGoalPlanningResponse({
        reply: "ok",
        plan: { daily: [], future: [] },
      }),
    ).toBeNull();
    expect(parseGoalPlanningResponse({ reply: "ok", extra: true })).toBeNull();
  });
});
