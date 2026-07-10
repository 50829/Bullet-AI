import { describe, expect, it } from "vitest";
import { MAX_AI_MESSAGE_CHARS, validateAiMessages } from "./requestPolicy";

describe("requestPolicy", () => {
  it("validates AI messages", () => {
    expect(validateAiMessages([{ role: "user", content: "hello" }])).toEqual({
      ok: true,
      messages: [{ role: "user", content: "hello" }],
    });
    expect(validateAiMessages([])).toEqual({
      ok: false,
      error: "messages cannot be empty",
    });
    expect(validateAiMessages([{ role: "system", content: "nope" }])).toEqual({
      ok: false,
      error: "message role must be user or assistant",
    });
    expect(
      validateAiMessages([
        { role: "user", content: "x".repeat(MAX_AI_MESSAGE_CHARS + 1) },
      ]),
    ).toEqual({
      ok: false,
      error: `message content cannot exceed ${MAX_AI_MESSAGE_CHARS} characters`,
    });
  });
});
