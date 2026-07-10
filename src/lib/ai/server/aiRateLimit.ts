type AiRateLimitClient = {
  rpc: (
    fn: "reserve_ai_usage_event",
  ) => PromiseLike<{ data: boolean | null; error: unknown }>;
};

export async function reserveAiUsageEvent(supabase: AiRateLimitClient) {
  return supabase.rpc("reserve_ai_usage_event");
}
