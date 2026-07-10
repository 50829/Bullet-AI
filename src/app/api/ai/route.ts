import { NextResponse } from "next/server";
import { parseAssistantRequestBody } from "../../../lib/ai/server/assistantRequest";
import { runAssistantTurn } from "../../../lib/ai/server/assistantService";
import { logger } from "../../../lib/observability/logger";
import { createRequestContext } from "../../../lib/observability/requestContext";
import { createClient } from "../../../lib/supabase/server";

export async function POST(req: Request) {
  const requestContext = createRequestContext(req, "/api/ai");
  const respond = (body: unknown, status: number) =>
    NextResponse.json(body, {
      status,
      headers: requestContext.responseHeaders(status),
    });
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return respond({ error: "请先登录" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return respond({ error: "Invalid JSON body" }, 400);
    }

    const parsedRequest = parseAssistantRequestBody(body);
    if ("error" in parsedRequest) {
      return respond({ error: parsedRequest.error }, 400);
    }

    const result = await runAssistantTurn({
      userId: user.id,
      supabase,
      input: parsedRequest.input,
      requestId: requestContext.requestId,
    });

    return respond(result.body, result.status);
  } catch (err) {
    logger.error("ai_route_unhandled_error", {
      requestId: requestContext.requestId,
      error: err,
    });
    return respond({ error: "Server error" }, 500);
  }
}
