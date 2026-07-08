import { NextResponse } from "next/server";
import {
  extractPlanFromReply,
  removePlanFromReply,
  toFrontendPlan,
} from "../../../lib/ai/planParser";
import {
  AI_RATE_LIMIT_WINDOW_MS,
  getAiRateLimitPerHour,
  validateAiMessages,
} from "../../../lib/ai/requestPolicy";
import {
  getAiSystemPrompt,
  normalizeAiPurpose,
} from "../../../lib/ai/promptRegistry";
import { normalizeLanguage } from "../../../lib/profile/preferences";
import { createClient } from "../../../lib/supabase/server";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

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

    const { messages: userMessages, language, purpose } = body as {
      messages: unknown;
      language?: string;
      purpose?: string;
    };
    const validation = validateAiMessages(userMessages);

    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const windowStart = new Date(
      Date.now() - AI_RATE_LIMIT_WINDOW_MS,
    ).toISOString();
    const { data: reserved, error: reserveError } = await supabase.rpc(
      "reserve_ai_usage_event",
      {
        p_user_id: user.id,
        p_window_start: windowStart,
        p_limit: getAiRateLimitPerHour(),
      },
    );

    if (reserveError) {
      console.error("[AI Route] 限流预留失败:", reserveError);
      return NextResponse.json(
        { error: "AI rate limit unavailable" },
        { status: 500 },
      );
    }

    if (!reserved) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 },
      );
    }

    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    let baseUrl = process.env.LLM_BASE_URL;

    if (!apiKey) {
      console.error("[AI Route] 未设置 LLM_API_KEY 环境变量");
      return NextResponse.json(
        { error: "服务器配置错误：未设置 API Key" },
        { status: 500 },
      );
    }
    if (!baseUrl) {
      console.error("[AI Route] 未设置 LLM_BASE_URL 环境变量");
      return NextResponse.json(
        { error: "服务器配置错误：未设置 API Base URL" },
        { status: 500 },
      );
    }

    let endpoint: string;
    if (baseUrl.includes("/chat/completions")) {
      endpoint = baseUrl;
    } else {
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }
      endpoint = `${baseUrl}/chat/completions`;
    }

    const normalizedLanguage = normalizeLanguage(language);
    const normalizedPurpose = normalizeAiPurpose(purpose);

    const system: ChatMessage = {
      role: "system",
      content: getAiSystemPrompt(normalizedPurpose, normalizedLanguage),
    };

    const messages: ChatMessage[] = [system, ...validation.messages];

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("豆包 API 调用失败:", errorText);

      try {
        const errorJson = JSON.parse(errorText);
        console.error("豆包 API 详细错误信息:", errorJson);
        if (errorJson.base_resp && errorJson.base_resp.status_code === 1004) {
          return NextResponse.json(
            { error: `API 认证失败: ${errorJson.base_resp.status_msg}` },
            { status: resp.status },
          );
        }
      } catch (e) {
        console.error("解析错误信息失败:", e);
      }

      return NextResponse.json(
        { error: `调用失败: ${errorText}` },
        { status: resp.status },
      );
    }

    const data = await resp.json();

    let reply: string = data.choices?.[0]?.message?.content || "";
    const internalPlan = extractPlanFromReply(reply);
    reply = removePlanFromReply(reply);
    const frontendPlan = internalPlan
      ? toFrontendPlan(internalPlan)
      : undefined;

    return NextResponse.json({
      reply,
      plan: frontendPlan,
    });
  } catch (err) {
    console.error("[AI Route] 发生错误：", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
