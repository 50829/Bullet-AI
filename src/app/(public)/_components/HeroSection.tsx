"use client";

import { Globe, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { getRevealClass } from "@/app/(public)/_hooks/useReveal";
import { useLanguage } from "@/shared/i18n/LanguageContext";

export function HeroSection({ isVisible }: { isVisible: boolean }) {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  return (
    <section className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
      <div
        className={`absolute top-4 left-4 flex items-center gap-3 z-20 ${getRevealClass(isVisible)}`}
      >
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
          <Sparkles className="h-6 w-6 text-gray-700" />
        </div>
        <span className="text-xl font-bold text-theme-primary">BulletAI</span>
      </div>

      <div
        className={`absolute top-4 right-4 flex items-center space-x-2 z-20 ${getRevealClass(isVisible)}`}
        style={{ transitionDelay: isVisible ? "80ms" : "0ms" }}
      >
        {(["en", "zh"] as const).map((option, index) => (
          <div key={option} className="contents">
            {index > 0 && <span className="text-gray-400 text-xs">|</span>}
            <button
              onClick={() => setLanguage(option)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                language === option
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                  : "text-gray-500 hover:text-amber-500"
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>{option === "en" ? "EN" : "中文"}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto pt-12 pb-20 min-h-[75vh]">
        <h1
          className={`text-6xl md:text-7xl font-bold text-theme-primary tracking-tight ${getRevealClass(isVisible)}`}
          style={{ transitionDelay: isVisible ? "120ms" : "0ms" }}
        >
          {t("heroTitle")}
        </h1>
        <div
          className={`mt-4 flex justify-center ${getRevealClass(isVisible)}`}
          style={{ transitionDelay: isVisible ? "220ms" : "0ms" }}
        >
          <p className="text-2xl md:text-3xl text-gray-600">{t("slogan")}</p>
        </div>
        <div
          className={`mt-10 flex flex-col sm:flex-row gap-4 ${getRevealClass(isVisible)}`}
          style={{ transitionDelay: isVisible ? "320ms" : "0ms" }}
        >
          <button
            onClick={() => router.push("/login")}
            className="flex h-14 min-w-[200px] items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-10 py-4 text-lg font-semibold text-[var(--color-text-on-primary)] shadow-sm transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
          >
            {t("getStarted")}
          </button>
        </div>
      </div>
    </section>
  );
}
