import { GOAL_PLANNING_PURPOSE } from "../goalPlan";
import { parsePlanReply } from "../planParser";
import { getAiSystemPrompt } from "../promptRegistry";
import { normalizeLanguage } from "../../profile/preferences";
import { logger } from "../../observability/logger";
import { reserveAiUsageEvent } from "./aiRateLimit";
import {
  LlmTimeoutError,
  readLlmConfig,
  requestChatCompletion,
} from "./llmClient";
import type { AssistantTurnInput } from "./assistantRequest";
import type { AssistantTurnResult, ChatMessage } from "./types";

type AssistantSupabaseClient = Parameters<typeof reserveAiUsageEvent>[0];

type AssistantServiceResponse =
  | { status: 200; body: AssistantTurnResult }
  | { status: number; body: { error: string } };

export async function runAssistantTurn({
  userId,
  supabase,
  input,
  requestId,
}: {
  userId: string;
  supabase: AssistantSupabaseClient;
  input: AssistantTurnInput;
  requestId?: string;
}): Promise<AssistantServiceResponse> {
  const logContext = {
    userId,
    ...(requestId ? { requestId } : {}),
  };
  const config = readLlmConfig();
  if ("logCode" in config) {
    logger.error(config.logCode, logContext);
    return {
      status: 500,
      body: { error: config.error },
    };
  }

  const { data: reserved, error: reserveError } =
    await reserveAiUsageEvent(supabase);

  if (reserveError) {
    logger.error("ai_rate_limit_reservation_failed", {
      ...logContext,
      error: reserveError,
    });
    return {
      status: 500,
      body: { error: "AI rate limit unavailable" },
    };
  }

  if (!reserved) {
    return {
      status: 429,
      body: { error: "请求过于频繁，请稍后再试" },
    };
  }

  // A successful reservation represents an attempted provider call. Timeouts
  // and provider failures intentionally consume quota.
  const normalizedLanguage = normalizeLanguage(input.language);

  const system: ChatMessage = {
    role: "system",
    content: getAiSystemPrompt(normalizedLanguage),
  };
  const messages: ChatMessage[] = [system, ...input.messages];

  let resp: Response;
  try {
    resp = await requestChatCompletion({
      config: config.config,
      messages,
    });
  } catch (error) {
    if (error instanceof LlmTimeoutError) {
      logger.warn("ai_llm_timeout", {
        ...logContext,
        purpose: GOAL_PLANNING_PURPOSE,
        timeoutMs: config.config.timeoutMs,
      });
      return {
        status: 504,
        body: { error: "AI 服务响应超时，请稍后再试" },
      };
    }

    logger.error("ai_llm_request_failed", {
      ...logContext,
      purpose: GOAL_PLANNING_PURPOSE,
      error,
    });
    return {
      status: 502,
      body: { error: "AI 服务暂时不可用，请稍后再试" },
    };
  }

  if (!resp.ok) {
    const errorText = await resp.text();
    logger.warn("ai_llm_bad_response", {
      ...logContext,
      purpose: GOAL_PLANNING_PURPOSE,
      status: resp.status,
      errorText,
    });

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.base_resp && errorJson.base_resp.status_code === 1004) {
        return {
          status: resp.status,
          body: { error: `API 认证失败: ${errorJson.base_resp.status_msg}` },
        };
      }
    } catch (error) {
      logger.warn("ai_llm_error_parse_failed", {
        ...logContext,
        purpose: GOAL_PLANNING_PURPOSE,
        error,
      });
    }

    return {
      status: resp.status,
      body: { error: "AI 服务暂时不可用，请稍后再试" },
    };
  }

  const data = await resp.json();
  const providerReply = data?.choices?.[0]?.message?.content;
  if (typeof providerReply !== "string" || !providerReply.trim()) {
    logger.warn("ai_llm_invalid_response", {
      ...logContext,
      purpose: GOAL_PLANNING_PURPOSE,
    });
    return {
      status: 502,
      body: { error: "AI 服务返回了无效响应，请稍后再试" },
    };
  }

  const parsedReply = parsePlanReply(providerReply);
  const body: AssistantTurnResult = parsedReply.plan
    ? { reply: parsedReply.reply, plan: parsedReply.plan }
    : { reply: parsedReply.reply };

  return {
    status: 200,
    body,
  };
}
