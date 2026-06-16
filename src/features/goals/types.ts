export type GoalPlanTask = {
  title: string;
  description: string;
};

export type GoalPlan = {
  daily: GoalPlanTask[];
  future: GoalPlanTask[];
};

export type CreateGoalInput = {
  title: string;
  description?: string;
  dueDate?: string | null;
};
