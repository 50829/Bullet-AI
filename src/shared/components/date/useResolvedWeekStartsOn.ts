"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  readLocalPreferences,
  resolveWeekStartsOn,
  type ResolvedWeekStartsOn,
  type UserPreferences,
} from "../../../lib/profile/preferences";

type PreferencesUpdatedEvent = CustomEvent<{
  preferences?: Partial<UserPreferences>;
}>;

export function useResolvedWeekStartsOn(): ResolvedWeekStartsOn {
  const { language } = useLanguage();
  const [weekStartsOn, setWeekStartsOn] = useState<ResolvedWeekStartsOn>(() =>
    resolveWeekStartsOn(readLocalPreferences().week_starts_on, language),
  );

  useEffect(() => {
    const updateFromLocalPreferences = () => {
      const preferences = readLocalPreferences();
      setWeekStartsOn(
        resolveWeekStartsOn(
          preferences.week_starts_on,
          preferences.preferred_language,
        ),
      );
    };

    updateFromLocalPreferences();

    const handlePreferencesUpdated = (event: Event) => {
      const preferences = (event as PreferencesUpdatedEvent).detail
        ?.preferences;
      if (!preferences) {
        updateFromLocalPreferences();
        return;
      }

      const nextPreferences = {
        ...readLocalPreferences(),
        ...preferences,
      };
      setWeekStartsOn(
        resolveWeekStartsOn(
          nextPreferences.week_starts_on,
          nextPreferences.preferred_language,
        ),
      );
    };

    window.addEventListener("preferences-updated", handlePreferencesUpdated);
    return () =>
      window.removeEventListener(
        "preferences-updated",
        handlePreferencesUpdated,
      );
  }, [language]);

  return weekStartsOn;
}
