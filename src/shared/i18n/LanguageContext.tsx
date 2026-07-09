"use client";

import { NextIntlClientProvider, useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import enMessages from "../../../messages/en.json";
import zhMessages from "../../../messages/zh.json";
import {
  LANGUAGE_STORAGE_KEY,
  readLocalPreferences,
  writeLocalPreferences,
  type PreferredLanguage,
  type UserPreferences,
} from "../../lib/profile/preferences";

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

type PreferencesUpdatedEvent = CustomEvent<{ preferences?: UserPreferences }>;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh");

  useEffect(() => {
    const applyLanguage = (nextLanguage: Language) => {
      setLanguageState(nextLanguage);
      document.documentElement.lang = nextLanguage;
    };

    applyLanguage(readLocalPreferences().preferred_language);

    const handlePreferencesUpdated = (event: Event) => {
      const nextLanguage = (event as PreferencesUpdatedEvent).detail
        ?.preferences?.preferred_language;

      if (nextLanguage) {
        applyLanguage(nextLanguage);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        applyLanguage(readLocalPreferences().preferred_language);
      }
    };

    window.addEventListener("preferences-updated", handlePreferencesUpdated);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "preferences-updated",
        handlePreferencesUpdated,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    writeLocalPreferences({ preferred_language: nextLanguage });
  }, []);

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
