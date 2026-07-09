import {
  validateAiMessages,
  type AiChatMessage,
} from "../requestPolicy";

export type AssistantTurnInput = {
  messages: AiChatMessage[];
  language?: string;
  purpose?: string;
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

  return {
    ok: true as const,
    input: {
      messages: validation.messages,
      language: typeof language === "string" ? language : undefined,
      purpose: typeof purpose === "string" ? purpose : undefined,
    },
  };
}
