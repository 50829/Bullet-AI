import type { ProfileEntity } from "../../domain/entities";
import { supabase } from "../supabase/client";
import {
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  type UserPreferences,
} from "./preferences";

export type UserProfile = {
  username: string;
  preferences: UserPreferences;
};

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

export function profileEntityToUserProfile(
  entity: ProfileEntity | null | undefined,
): UserProfile | null {
  if (!entity) return null;
  return {
    username: entity.username,
    preferences: normalizePreferences({
      preferred_language: entity.preferredLanguage,
      ui_theme: "calm",
      accent_color: entity.accentColor,
      color_scheme: entity.colorScheme,
      completed_goal_retention: entity.completedGoalRetention,
      week_starts_on: entity.weekStartsOn,
    }),
  };
}

export function createDefaultProfileEntity(userId: string): ProfileEntity {
  const now = new Date().toISOString();
  return {
    clientId: userId,
    userId,
    version: 0,
    createdAt: now,
    updatedAt: now,
    username: "",
    preferredLanguage: DEFAULT_USER_PREFERENCES.preferred_language,
    accentColor: DEFAULT_USER_PREFERENCES.accent_color,
    colorScheme: DEFAULT_USER_PREFERENCES.color_scheme,
    completedGoalRetention: DEFAULT_USER_PREFERENCES.completed_goal_retention,
    weekStartsOn: DEFAULT_USER_PREFERENCES.week_starts_on,
  };
}
