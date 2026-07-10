"use client";

import { usePreferences } from "@/lib/profile/PreferencesContext";

export function useCompletedGoalRetention() {
  return usePreferences().preferences.completed_goal_retention;
}
