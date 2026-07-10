import { validateAiMessages, type AiChatMessage } from "../requestPolicy";
import { GOAL_PLANNING_PURPOSE } from "../goalPlan";

export type AssistantTurnInput = {
  messages: AiChatMessage[];
  language?: string;
  purpose: typeof GOAL_PLANNING_PURPOSE;
};

export function parseAssistantRequestBody(
  body: unknown,
): { ok: true; input: AssistantTurnInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false as const, error: "Invalid JSON body" };
  }

  const {
    messages: userMessages,
    language,
    purpose,
  } = body as {
    messages?: unknown;
    language?: unknown;
    purpose?: unknown;
  };
  const validation = validateAiMessages(userMessages);

  if ("error" in validation) {
    return { ok: false as const, error: validation.error };
  }
  if (purpose !== GOAL_PLANNING_PURPOSE) {
    return {
      ok: false as const,
      error: `purpose must be ${GOAL_PLANNING_PURPOSE}`,
    };
  }

  return {
    ok: true as const,
    input: {
      messages: validation.messages,
      language: typeof language === "string" ? language : undefined,
      purpose: GOAL_PLANNING_PURPOSE,
    },
  };
}
