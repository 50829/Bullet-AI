import type { ProfileEntity } from "../../domain/entities";
import { normalizePreferences, type UserPreferences } from "./preferences";

export type UserProfile = {
  username: string;
  preferences: UserPreferences;
};

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
