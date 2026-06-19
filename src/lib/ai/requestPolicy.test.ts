import { describe, expect, it, vi } from "vitest";
import {
  MAX_AI_MESSAGE_CHARS,
  getAiRateLimitPerHour,
  validateAiMessages,
} from "./requestPolicy";

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
    expect(validateAiMessages([{ role: "user", content: "x".repeat(MAX_AI_MESSAGE_CHARS + 1) }])).toEqual({
      ok: false,
      error: `message content cannot exceed ${MAX_AI_MESSAGE_CHARS} characters`,
    });
  });

  it("uses the configured rate limit when valid", () => {
    vi.stubEnv("AI_RATE_LIMIT_PER_HOUR", "7");
    expect(getAiRateLimitPerHour()).toBe(7);
    vi.stubEnv("AI_RATE_LIMIT_PER_HOUR", "not-a-number");
    expect(getAiRateLimitPerHour()).toBe(20);
  });
});
