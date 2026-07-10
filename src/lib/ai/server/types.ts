import type { GoalPlan } from "../goalPlan";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AssistantTurnResult = {
  reply: string;
  plan?: GoalPlan;
};
