import { NextResponse } from "next/server";
import { parseAssistantRequestBody } from "../../../lib/ai/server/assistantRequest";
import { runAssistantTurn } from "../../../lib/ai/server/assistantService";
import { logger } from "../../../lib/observability/logger";
import { createClient } from "../../../lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedRequest = parseAssistantRequestBody(body);
    if ("error" in parsedRequest) {
      return NextResponse.json(
        { error: parsedRequest.error },
        { status: 400 },
      );
    }

    const result = await runAssistantTurn({
      userId: user.id,
      supabase,
      input: parsedRequest.input,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    logger.error("ai_route_unhandled_error", { error: err });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
