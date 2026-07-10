import type { GoalPlan } from "../../../lib/ai/goalPlan";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  planData?: GoalPlan | null;
};
