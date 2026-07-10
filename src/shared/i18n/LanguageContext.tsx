"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import enMessages from "@messages/en.json";
import zhMessages from "@messages/zh.json";
import { usePreferences } from "../../lib/profile/PreferencesContext";
import type { PreferredLanguage } from "../../lib/profile/preferences";

export type Language = PreferredLanguage;

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const messages: Record<Language, Record<string, string>> = {
  zh: zhMessages,
  en: enMessages,
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const subscribeToHydration = () => () => undefined;

function useIsHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences } = usePreferences();
  const language = preferences.preferred_language;

  const setLanguage = useCallback(
    (nextLanguage: Language) => {
      updatePreferences({ preferred_language: nextLanguage });
    },
    [updatePreferences],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  const isHydrated = useIsHydrated();

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  // Every consumer uses the server locale for its own hydration pass. This is
  // important for components inside selectively hydrated Suspense boundaries.
  const language = isHydrated ? context.language : "zh";

  const t = (key: string, fallback = "") => {
    return messages[language][key] ?? fallback;
  };

  return {
    language,
    setLanguage: context.setLanguage,
    t,
  };
}
