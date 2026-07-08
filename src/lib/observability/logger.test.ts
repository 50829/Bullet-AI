import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger, sanitizeLogContext } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("redacts sensitive fields and truncates long strings", () => {
    const sanitized = sanitizeLogContext({
      token: "secret-token",
      nested: {
        apiKey: "secret-key",
        message: "x".repeat(600),
      },
    }) as Record<string, unknown>;

    expect(sanitized.token).toBe("[redacted]");
    expect(sanitized.nested).toMatchObject({
      apiKey: "[redacted]",
      message: expect.stringMatching(/^x{500}\.\.\.$/),
    });
  });

  it("logs structured payloads without raw Blob values", () => {
    logger.warn("test_event", {
      userId: "user-1",
      file: new Blob(["private"]),
    });

    expect(console.warn).toHaveBeenCalledWith({
      event: "test_event",
      userId: "user-1",
      file: "[Blob 7 bytes]",
    });
  });
});
