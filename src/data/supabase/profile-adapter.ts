import type { ProfileEntity } from "../../domain/entities";
import { supabase } from "../../lib/supabase/client";

export const PROFILE_SELECT =
  "user_id,username,preferred_language,accent_color,color_scheme,completed_goal_retention,week_starts_on,version,created_at,updated_at";

export function profileEntityFromRow(
  row: Record<string, unknown>,
): ProfileEntity {
  const userId = String(row.user_id ?? "");
  if (!userId) throw new Error("Invalid profile user_id");
  return {
    clientId: userId,
    userId,
    version: typeof row.version === "number" ? row.version : 1,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    username: typeof row.username === "string" ? row.username : "",
    preferredLanguage: row.preferred_language === "en" ? "en" : "zh",
    accentColor:
      row.accent_color === "green" ||
      row.accent_color === "purple" ||
      row.accent_color === "amber"
        ? row.accent_color
        : "sage",
    colorScheme:
      row.color_scheme === "light" || row.color_scheme === "dark"
        ? row.color_scheme
        : "system",
    completedGoalRetention:
      row.completed_goal_retention === "instant" ||
      row.completed_goal_retention === "never"
        ? row.completed_goal_retention
        : "next_day",
    weekStartsOn:
      row.week_starts_on === "monday" ||
      row.week_starts_on === "sunday" ||
      row.week_starts_on === "saturday"
        ? row.week_starts_on
        : "auto",
  };
}

export async function loadRemoteProfiles(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? [profileEntityFromRow(data as unknown as Record<string, unknown>)]
    : [];
}
