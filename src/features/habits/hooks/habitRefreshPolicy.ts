export const HABIT_REFRESH_TTL_MS = 60_000;

export function shouldRefreshHabits(
  lastRefreshedAt: number | null,
  now = Date.now(),
) {
  return (
    lastRefreshedAt === null || now - lastRefreshedAt >= HABIT_REFRESH_TTL_MS
  );
}
