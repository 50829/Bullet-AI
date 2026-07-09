import type { LocalFirstEntity } from "../../lib/localFirst/types";

export type GoalRecord = LocalFirstEntity & {
  title: string;
  description: string;
  status: string;
  due_date?: string | null;
  progress: number;
  color?: string | null;
  sort_order?: number | null;
};

export type CreateGoalInput = {
  id?: number;
  client_id?: string;
  title: string;
  description?: string | null;
  status?: string;
  due_date?: string | null;
  dueDate?: string | null;
  progress?: number;
  color?: string | null;
  sort_order?: number | null;
  image_url?: string | null;
  image_path?: string | null;
  created_at?: string;
};

export type UpdateGoalInput = Partial<
  Pick<
    GoalRecord,
    | "title"
    | "description"
    | "status"
    | "due_date"
    | "progress"
    | "color"
    | "sort_order"
    | "image_url"
    | "image_path"
  >
>;

export type GoalPlanTask = {
  title: string;
  description: string;
};

export type GoalPlan = {
  daily: GoalPlanTask[];
  future: GoalPlanTask[];
};
