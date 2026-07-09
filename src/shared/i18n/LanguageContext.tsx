"use client";

import { NextIntlClientProvider, useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import enMessages from "../../../messages/en.json";
import zhMessages from "../../../messages/zh.json";
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences } = usePreferences();
  const language = preferences.preferred_language;

  const setLanguage = useCallback((nextLanguage: Language) => {
    updatePreferences({ preferred_language: nextLanguage });
  }, [updatePreferences]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      <NextIntlClientProvider
        locale={language}
        messages={messages[language]}
        getMessageFallback={({ key }) => key}
        onError={(error) => {
          if (error.code !== "MISSING_MESSAGE") {
            console.error(error);
          }
        }}
        timeZone="Asia/Shanghai"
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  const translate = useTranslations();

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  const t = (key: string, fallback = "") => {
    try {
      const message = translate(key);
      return message === key ? fallback : message;
    } catch {
      return fallback;
    }
  };

  return {
    language: context.language,
    setLanguage: context.setLanguage,
    t,
  };
}
