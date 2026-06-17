import type { CompletedGoalRetention } from "../../lib/profile/preferences";

export type GoalVisibilityItem = {
  status?: string;
  updated_at?: string;
  created_at?: string;
  sort_order?: number | null;
};

export function isGoalCompleted(goal: GoalVisibilityItem) {
  return goal.status === "completed";
}

/**
 * Effective ordering value for a goal. Smaller sorts first. Goals without an
 * explicit `sort_order` (newly created, or never dragged) fall back to the
 * negative created timestamp so the newest appears on top — matching the
 * previous "newest first" behaviour until the user manually reorders.
 */
function goalOrderValue(goal: GoalVisibilityItem) {
  if (typeof goal.sort_order === "number") return goal.sort_order;
  const created = goal.created_at ? new Date(goal.created_at).getTime() : 0;
  return -created;
}

export function sortGoalsByOrder<T extends GoalVisibilityItem>(goals: T[]) {
  return goals
    .map((goal, index) => ({ goal, index }))
    .sort((a, b) => {
      const diff = goalOrderValue(a.goal) - goalOrderValue(b.goal);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(({ goal }) => goal);
}

export function sortGoalsByCompletion<T extends GoalVisibilityItem>(goals: T[]) {
  return goals
    .map((goal, index) => ({ goal, index }))
    .sort((a, b) => {
      const aCompleted = isGoalCompleted(a.goal);
      const bCompleted = isGoalCompleted(b.goal);
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
      return a.index - b.index;
    })
    .map(({ goal }) => goal);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function shouldShowGoal(goal: GoalVisibilityItem, retention: CompletedGoalRetention, now = new Date()) {
  if (!isGoalCompleted(goal)) return true;
  if (retention === "never") return true;
  if (retention === "instant") return false;

  const completedAt = new Date(goal.updated_at || goal.created_at || Date.now());
  return startOfLocalDay(completedAt) === startOfLocalDay(now);
}
