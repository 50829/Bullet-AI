type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const MAX_STRING_LENGTH = 500;
const REDACTED = "[redacted]";
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|cookie|authorization|api[_-]?key/i;

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
    };
  }

  if (value instanceof Blob) {
    return `[Blob ${value.size} bytes]`;
  }

  if (typeof value === "string") return truncate(value);

  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as LogContext).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(nestedValue),
      ]),
    );
  }

  return value;
}

function truncate(value: string) {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}...`;
}

function writeLog(level: LogLevel, event: string, context?: LogContext) {
  const payload = {
    event,
    ...(context ? (sanitizeValue(context) as LogContext) : {}),
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export const logger = {
  info: (event: string, context?: LogContext) =>
    writeLog("info", event, context),
  warn: (event: string, context?: LogContext) =>
    writeLog("warn", event, context),
  error: (event: string, context?: LogContext) =>
    writeLog("error", event, context),
};

export const sanitizeLogContext = sanitizeValue;
