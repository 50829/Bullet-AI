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
  readLocalPreferences,
  writeLocalPreferences,
  type PreferredLanguage,
} from "../../lib/profile/preferences";
import {
  getCurrentUserProfile,
  updateCurrentUserPreferences,
} from "../../lib/profile/profileService";

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
  const [language, setLanguageState] = useState<Language>("zh");

  useEffect(() => {
    let isMounted = true;
    const localPreferences = readLocalPreferences();

    setLanguageState(localPreferences.preferred_language);
    document.documentElement.lang = localPreferences.preferred_language;

    getCurrentUserProfile()
      .then((profile) => {
        if (!isMounted || !profile) return;

        const remoteLanguage = profile.preferences.preferred_language;
        writeLocalPreferences(profile.preferences);
        if (remoteLanguage !== localPreferences.preferred_language) {
          setLanguageState(remoteLanguage);
        }
      })
      .catch((error) => {
        console.error("Failed to sync language preference:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    writeLocalPreferences({ preferred_language: nextLanguage });

    void updateCurrentUserPreferences({
      preferred_language: nextLanguage,
    }).catch(() => {
      return undefined;
    });
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
        key={language}
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

  const t = (key: string) => {
    try {
      return translate(key);
    } catch {
      return key;
    }
  };

  return {
    language: context.language,
    setLanguage: context.setLanguage,
    t,
  };
}
