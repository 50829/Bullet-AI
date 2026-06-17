"use client";

import { useEffect } from "react";
import {
  ACCENT_COLOR_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
  UI_THEME_STORAGE_KEY,
  applyAppearancePreference,
  readLocalPreferences,
  type UserPreferences,
} from "../../lib/profile/preferences";

type PreferencesUpdatedEvent = CustomEvent<{ preferences: UserPreferences }>;

export function ThemeInitializer() {
  useEffect(() => {
    applyAppearancePreference(readLocalPreferences());

    const handlePreferencesUpdated = (event: Event) => {
      const preferences = (event as PreferencesUpdatedEvent).detail?.preferences;
      if (preferences) {
        applyAppearancePreference(preferences);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === ACCENT_COLOR_STORAGE_KEY ||
        event.key === UI_THEME_STORAGE_KEY ||
        event.key === COLOR_SCHEME_STORAGE_KEY
      ) {
        applyAppearancePreference(readLocalPreferences());
      }
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemColorSchemeChange = () => {
      const preferences = readLocalPreferences();
      if (preferences.color_scheme === "system") {
        applyAppearancePreference(preferences);
      }
    };

    window.addEventListener("preferences-updated", handlePreferencesUpdated);
    window.addEventListener("storage", handleStorageChange);
    media.addEventListener("change", handleSystemColorSchemeChange);

    return () => {
      window.removeEventListener("preferences-updated", handlePreferencesUpdated);
      window.removeEventListener("storage", handleStorageChange);
      media.removeEventListener("change", handleSystemColorSchemeChange);
    };
  }, []);

  return null;
}
