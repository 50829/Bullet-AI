export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AssistantTurnResult = {
  reply: string;
  plan?: {
    daily: { title: string; description: string }[];
    future: { title: string; description: string }[];
  };
};

export type AssistantAction = {
  type: string;
  payload: unknown;
};
