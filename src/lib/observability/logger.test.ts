import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger, sanitizeLogContext, setLogSink } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    setLogSink(null);
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

    expect(console.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warn",
        event: "test_event",
        userId: "user-1",
        file: "[Blob 7 bytes]",
        timestamp: expect.any(String),
      }),
    );
  });

  it("adds correlation context and preserves error diagnostics", () => {
    const events: Array<Record<string, unknown>> = [];
    setLogSink((payload) => events.push(payload));
    const requestLogger = logger.child({ requestId: "request-1" });

    requestLogger.error("request_failed", {
      error: new Error("boom", { cause: new Error("root cause") }),
    });

    expect(events[0]).toMatchObject({
      level: "error",
      event: "request_failed",
      requestId: "request-1",
      error: {
        name: "Error",
        message: "boom",
        stack: expect.any(String),
        cause: { message: "root cause" },
      },
    });
    setLogSink(null);
  });
});
