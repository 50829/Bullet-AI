import type { CompletedGoalRetention } from "../../lib/profile/preferences";

export type GoalVisibilityItem = {
  status?: string;
  updated_at?: string;
  created_at?: string;
};

export function isGoalCompleted(goal: GoalVisibilityItem) {
  return goal.status === "completed";
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
