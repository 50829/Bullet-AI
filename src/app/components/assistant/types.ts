export type AssistantMode = "chat" | "planning";

export type PlanData = {
  daily: { title: string; description: string }[];
  future: { title: string; description: string }[];
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  planData?: PlanData | null;
};
