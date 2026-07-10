import type { GoalEntity } from "../../domain/entities";

export type { GoalPlan, GoalPlanTask } from "../../lib/ai/goalPlan";

export type GoalRecord = GoalEntity;

export type CreateGoalInput = {
  clientId?: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  color?: string | null;
  sortOrder?: number;
};

export type UpdateGoalInput = Partial<
  Pick<
    GoalRecord,
    "title" | "description" | "dueDate" | "completedAt" | "color" | "sortOrder"
  >
>;
