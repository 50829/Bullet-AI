export const GOAL_PLANNING_PURPOSE = "goal_planning" as const;

export const MAX_GOAL_PLAN_TASKS_PER_GROUP = 10;
const MAX_GOAL_PLAN_TASKS = MAX_GOAL_PLAN_TASKS_PER_GROUP * 2;
export const MAX_GOAL_PLAN_TITLE_CHARS = 30;
export const MAX_GOAL_PLAN_DESCRIPTION_CHARS = 200;

export type GoalPlanTask = {
  title: string;
  description: string;
};

export type GoalPlan = {
  daily: GoalPlanTask[];
  future: GoalPlanTask[];
};

export type GoalPlanningResponse = {
  reply: string;
  plan?: GoalPlan;
};

type UnknownRecord = Record<string, unknown>;

function hasExactKeys(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): value is UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const keys = Object.keys(value);
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  return (
    requiredKeys.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => allowedKeys.has(key))
  );
}

function parseGoalPlanTask(value: unknown): GoalPlanTask | null {
  if (!hasExactKeys(value, ["title", "description"])) return null;
  if (
    typeof value.title !== "string" ||
    typeof value.description !== "string"
  ) {
    return null;
  }

  const title = value.title.trim();
  const description = value.description.trim();
  if (
    title.length === 0 ||
    title.length > MAX_GOAL_PLAN_TITLE_CHARS ||
    description.length === 0 ||
    description.length > MAX_GOAL_PLAN_DESCRIPTION_CHARS
  ) {
    return null;
  }

  return { title, description };
}

function parseTaskGroup(value: unknown): GoalPlanTask[] | null {
  if (!Array.isArray(value) || value.length > MAX_GOAL_PLAN_TASKS_PER_GROUP) {
    return null;
  }

  const tasks: GoalPlanTask[] = [];
  for (const item of value) {
    const task = parseGoalPlanTask(item);
    if (!task) return null;
    tasks.push(task);
  }
  return tasks;
}

export function parseGoalPlan(value: unknown): GoalPlan | null {
  if (!hasExactKeys(value, ["daily", "future"])) return null;

  const daily = parseTaskGroup(value.daily);
  const future = parseTaskGroup(value.future);
  if (!daily || !future) return null;
  if (daily.length + future.length === 0) return null;
  if (daily.length + future.length > MAX_GOAL_PLAN_TASKS) return null;

  return { daily, future };
}

export function parseInternalGoalPlan(value: unknown): GoalPlan | null {
  if (!hasExactKeys(value, ["tasksDaily", "tasksFuture"])) return null;
  return parseGoalPlan({
    daily: value.tasksDaily,
    future: value.tasksFuture,
  });
}

export function parseGoalPlanningResponse(
  value: unknown,
): GoalPlanningResponse | null {
  if (!hasExactKeys(value, ["reply"], ["plan"])) return null;
  if (typeof value.reply !== "string") return null;

  if (!Object.hasOwn(value, "plan")) {
    return value.reply.trim() ? { reply: value.reply } : null;
  }

  const plan = parseGoalPlan(value.plan);
  if (!plan) return null;
  return { reply: value.reply, plan };
}
