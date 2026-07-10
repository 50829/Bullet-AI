import { logger } from "./logger";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function createRequestContext(request: Request, route: string) {
  const incoming = request.headers.get("x-request-id");
  const requestId =
    incoming && REQUEST_ID_PATTERN.test(incoming)
      ? incoming
      : crypto.randomUUID();
  const startedAt = performance.now();
  const requestLogger = logger.child({ requestId, route });

  return {
    requestId,
    logger: requestLogger,
    responseHeaders(status: number) {
      const durationMs = Math.max(0, performance.now() - startedAt);
      requestLogger.info("http_request_completed", { status, durationMs });
      return {
        "x-request-id": requestId,
        "Server-Timing": `app;dur=${durationMs.toFixed(1)}`,
      };
    },
  };
}
