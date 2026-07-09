import {
  AI_RATE_LIMIT_WINDOW_MS,
  getAiRateLimitPerHour,
} from "../requestPolicy";

type AiRateLimitClient = {
  rpc: (...args: unknown[]) => PromiseLike<{ data: boolean | null; error: unknown }>;
};

export async function reserveAiUsageEvent(
  supabase: AiRateLimitClient,
  userId: string,
) {
  const windowStart = new Date(
    Date.now() - AI_RATE_LIMIT_WINDOW_MS,
  ).toISOString();

  return supabase.rpc("reserve_ai_usage_event", {
    p_user_id: userId,
    p_window_start: windowStart,
    p_limit: getAiRateLimitPerHour(),
  });
}
