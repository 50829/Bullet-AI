"use client";

import {NextIntlClientProvider, useTranslations} from "next-intl";
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

export type Language = "zh" | "en";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LANGUAGE_STORAGE_KEY = "language";

const messages: Record<Language, Record<string, string>> = {
  zh: zhMessages,
  en: enMessages,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "zh";

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith("en") ? "en" : "zh";
}

export function LanguageProvider({children}: {children: ReactNode}) {
  const [language, setLanguageState] = useState<Language>("zh");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const initialLanguage = getInitialLanguage();
    setLanguageState(initialLanguage);
    document.documentElement.lang = initialLanguage;
    setIsHydrated(true);
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    document.documentElement.lang = nextLanguage;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
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
        getMessageFallback={({key}) => key}
        onError={(error) => {
          if (error.code !== "MISSING_MESSAGE") {
            console.error(error);
          }
        }}
        timeZone="Asia/Shanghai"
      >
        {isHydrated ? children : children}
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
