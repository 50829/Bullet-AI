"use client";

import { useMemo } from "react";
import { usePreferences } from "../../../lib/profile/PreferencesContext";
import {
  resolveWeekStartsOn,
  type ResolvedWeekStartsOn,
} from "../../../lib/profile/preferences";

export function useResolvedWeekStartsOn(): ResolvedWeekStartsOn {
  const { preferences } = usePreferences();
  return useMemo(
    () =>
      resolveWeekStartsOn(
        preferences.week_starts_on,
        preferences.preferred_language,
      ),
    [preferences.preferred_language, preferences.week_starts_on],
  );
}
