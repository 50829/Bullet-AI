type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;
type LogPayload = LogContext & {
  timestamp: string;
  level: LogLevel;
  event: string;
};

export type LogSink = (payload: LogPayload) => void;

const MAX_STRING_LENGTH = 500;
const MAX_STACK_LENGTH = 2_000;
const REDACTED = "[redacted]";
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|cookie|authorization|api[_-]?key/i;

function truncate(value: string, maxLength = MAX_STRING_LENGTH) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
      ...(value.stack
        ? { stack: truncate(value.stack, MAX_STACK_LENGTH) }
        : {}),
      ...("cause" in value && value.cause !== undefined
        ? { cause: sanitizeValue(value.cause, seen) }
        : {}),
    };
  }

  if (value instanceof Blob) return `[Blob ${value.size} bytes]`;
  if (typeof value === "string") return truncate(value);
  if (Array.isArray(value))
    return value.slice(0, 20).map((item) => sanitizeValue(item, seen));

  if (value && typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value as LogContext).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? REDACTED
          : sanitizeValue(nestedValue, seen),
      ]),
    );
  }

  return value;
}

function consoleSink(payload: LogPayload) {
  if (payload.level === "error") {
    console.error(payload);
    return;
  }
  if (payload.level === "warn") {
    console.warn(payload);
    return;
  }
  console.info(payload);
}

let activeSink: LogSink = consoleSink;

/** Allows a production telemetry adapter to receive the same sanitized event. */
export function setLogSink(sink: LogSink | null) {
  activeSink = sink ?? consoleSink;
}

function writeLog(
  level: LogLevel,
  event: string,
  baseContext: LogContext,
  context?: LogContext,
) {
  const sanitized = sanitizeValue({ ...baseContext, ...context }) as LogContext;
  activeSink({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitized,
  });
}

function createLogger(baseContext: LogContext = {}) {
  return {
    info: (event: string, context?: LogContext) =>
      writeLog("info", event, baseContext, context),
    warn: (event: string, context?: LogContext) =>
      writeLog("warn", event, baseContext, context),
    error: (event: string, context?: LogContext) =>
      writeLog("error", event, baseContext, context),
    child: (context: LogContext) =>
      createLogger({ ...baseContext, ...context }),
  };
}

export const logger = createLogger();
export const sanitizeLogContext = sanitizeValue;
