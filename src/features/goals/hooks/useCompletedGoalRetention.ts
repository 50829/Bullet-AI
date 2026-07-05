"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeCompletedGoalRetention,
  readLocalPreferences,
  type CompletedGoalRetention,
  type UserPreferences,
} from "../../../lib/profile/preferences";

export function useCompletedGoalRetention() {
  const [retention, setRetention] = useState<CompletedGoalRetention>(
    DEFAULT_USER_PREFERENCES.completed_goal_retention,
  );

  useEffect(() => {
    setRetention(readLocalPreferences().completed_goal_retention);

    const handlePreferencesUpdated = (event: Event) => {
      const preferences = (
        event as CustomEvent<{ preferences?: Partial<UserPreferences> }>
      ).detail?.preferences;
      setRetention(
        normalizeCompletedGoalRetention(preferences?.completed_goal_retention),
      );
    };

    window.addEventListener("preferences-updated", handlePreferencesUpdated);
    return () =>
      window.removeEventListener(
        "preferences-updated",
        handlePreferencesUpdated,
      );
  }, []);

  return retention;
}
