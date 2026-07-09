import type { ChatMessage } from "./types";

const DEFAULT_LLM_TIMEOUT_MS = 30_000;

type LlmConfigError = {
  ok: false;
  logCode: "ai_missing_api_key" | "ai_missing_base_url" | "ai_missing_model";
  error: string;
};

export type LlmConfig = {
  apiKey: string;
  endpoint: string;
  model: string;
  timeoutMs: number;
};

export class LlmTimeoutError extends Error {
  constructor() {
    super("LLM request timed out");
    this.name = "LlmTimeoutError";
  }
}

function getLlmTimeoutMs() {
  const raw = process.env.LLM_TIMEOUT_MS;
  if (!raw) return DEFAULT_LLM_TIMEOUT_MS;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_LLM_TIMEOUT_MS;
}

function endpointForBaseUrl(baseUrl: string) {
  if (baseUrl.includes("/chat/completions")) return baseUrl;
  return `${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/chat/completions`;
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message.includes("aborted"))
  );
}

export function readLlmConfig(): LlmConfigError | { ok: true; config: LlmConfig } {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  const baseUrl = process.env.LLM_BASE_URL;

  if (!apiKey) {
    return {
      ok: false as const,
      logCode: "ai_missing_api_key",
      error: "服务器配置错误：未设置 API Key",
    };
  }
  if (!baseUrl) {
    return {
      ok: false as const,
      logCode: "ai_missing_base_url",
      error: "服务器配置错误：未设置 API Base URL",
    };
  }
  if (!model) {
    return {
      ok: false as const,
      logCode: "ai_missing_model",
      error: "服务器配置错误：未设置模型",
    };
  }

  return {
    ok: true as const,
    config: {
      apiKey,
      endpoint: endpointForBaseUrl(baseUrl),
      model,
      timeoutMs: getLlmTimeoutMs(),
    },
  };
}

export async function requestChatCompletion({
  config,
  messages,
  fetchImpl = fetch,
}: {
  config: LlmConfig;
  messages: ChatMessage[];
  fetchImpl?: typeof fetch;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    return await fetchImpl(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.5,
      }),
    });
  } catch (error) {
    if (isAbortError(error)) throw new LlmTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
