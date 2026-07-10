export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_AI_MESSAGES = 20;
export const MAX_AI_MESSAGE_CHARS = 4000;
const MAX_AI_TOTAL_CHARS = 12000;

export function validateAiMessages(
  value: unknown,
): { ok: true; messages: AiChatMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "messages must be an array" };
  }

  if (value.length === 0) {
    return { ok: false, error: "messages cannot be empty" };
  }

  if (value.length > MAX_AI_MESSAGES) {
    return {
      ok: false,
      error: `messages cannot exceed ${MAX_AI_MESSAGES} items`,
    };
  }

  let totalLength = 0;
  const messages: AiChatMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "each message must be an object" };
    }

    const { role, content } = item as Partial<AiChatMessage>;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "message role must be user or assistant" };
    }

    if (typeof content !== "string" || !content.trim()) {
      return { ok: false, error: "message content is required" };
    }

    if (content.length > MAX_AI_MESSAGE_CHARS) {
      return {
        ok: false,
        error: `message content cannot exceed ${MAX_AI_MESSAGE_CHARS} characters`,
      };
    }

    totalLength += content.length;
    if (totalLength > MAX_AI_TOTAL_CHARS) {
      return {
        ok: false,
        error: `total message content cannot exceed ${MAX_AI_TOTAL_CHARS} characters`,
      };
    }

    messages.push({ role, content });
  }

  return { ok: true, messages };
}
