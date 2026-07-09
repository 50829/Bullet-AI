"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../supabaseClient";
import { getCurrentUserProfile } from "./profileService";
import {
  ACCENT_COLOR_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
  COMPLETED_GOAL_RETENTION_STORAGE_KEY,
  DEFAULT_USER_PREFERENCES,
  LANGUAGE_STORAGE_KEY,
  UI_THEME_STORAGE_KEY,
  WEEK_STARTS_ON_STORAGE_KEY,
  applyAppearancePreference,
  normalizePreferences,
  readLocalPreferences,
  writeLocalPreferences,
  type UserPreferences,
} from "./preferences";

type PreferencesContextValue = {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => UserPreferences;
  replacePreferences: (nextPreferences: UserPreferences) => UserPreferences;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

const PREFERENCE_STORAGE_KEYS = new Set<string>([
  LANGUAGE_STORAGE_KEY,
  UI_THEME_STORAGE_KEY,
  ACCENT_COLOR_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
  COMPLETED_GOAL_RETENTION_STORAGE_KEY,
  WEEK_STARTS_ON_STORAGE_KEY,
]);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    DEFAULT_USER_PREFERENCES,
  );

  useEffect(() => {
    const nextPreferences = readLocalPreferences();
    setPreferences(nextPreferences);
    applyAppearancePreference(nextPreferences);
    document.documentElement.lang = nextPreferences.preferred_language;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemColorSchemeChange = () => {
      const currentPreferences = readLocalPreferences();
      if (currentPreferences.color_scheme === "system") {
        applyAppearancePreference(currentPreferences);
      }
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || !PREFERENCE_STORAGE_KEYS.has(event.key)) return;
      const storedPreferences = readLocalPreferences();
      setPreferences(storedPreferences);
      applyAppearancePreference(storedPreferences);
      document.documentElement.lang = storedPreferences.preferred_language;
    };

    window.addEventListener("storage", handleStorageChange);
    media.addEventListener("change", handleSystemColorSchemeChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      media.removeEventListener("change", handleSystemColorSchemeChange);
    };
  }, []);

  const applyPreferences = useCallback((nextPreferences: UserPreferences) => {
    applyAppearancePreference(nextPreferences);
    document.documentElement.lang = nextPreferences.preferred_language;
  }, []);

  const replacePreferences = useCallback((nextPreferences: UserPreferences) => {
    const normalized = normalizePreferences(nextPreferences);
    setPreferences(normalized);
    writeLocalPreferences(normalized);
    applyPreferences(normalized);
    return normalized;
  }, [applyPreferences]);

  useEffect(() => {
    let isMounted = true;

    const syncCloudPreferences = () => {
      void getCurrentUserProfile()
        .then((profile) => {
          if (isMounted && profile) replacePreferences(profile.preferences);
        })
        .catch((error) => {
          console.error("Failed to sync user preferences:", error);
        });
    };

    syncCloudPreferences();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) syncCloudPreferences();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [replacePreferences]);

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      const nextPreferences = normalizePreferences({
        ...preferences,
        ...updates,
      });
      setPreferences(nextPreferences);
      writeLocalPreferences(nextPreferences);
      applyPreferences(nextPreferences);
      return nextPreferences;
    },
    [applyPreferences, preferences],
  );

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences,
      replacePreferences,
    }),
    [preferences, replacePreferences, updatePreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
