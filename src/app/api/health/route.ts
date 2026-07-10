import { NextResponse } from "next/server";
import { createRequestContext } from "../../../lib/observability/requestContext";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request, "/api/health");
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ] as const;
  const missing = required.filter((name) => !process.env[name]);
  const status = missing.length === 0 ? 200 : 503;

  return NextResponse.json(
    {
      status: status === 200 ? "ok" : "misconfigured",
      timestamp: new Date().toISOString(),
      checks: {
        configuration: missing.length === 0 ? "ok" : "failed",
      },
    },
    { status, headers: context.responseHeaders(status) },
  );
}
