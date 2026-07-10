"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getRevealClass,
  useScrollReveal,
} from "@/app/(public)/_hooks/useReveal";
import { useLanguage } from "@/shared/i18n/LanguageContext";

export function LandingFooter({ scrollToTop }: { scrollToTop: () => void }) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <footer ref={ref} className="relative py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-gray-600">
        <div
          className={`flex flex-col items-center sm:items-start ${getRevealClass(isVisible)}`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
              <Sparkles className="h-6 w-6 text-gray-700" />
            </div>
            <span className="font-bold text-xl text-theme-primary">
              BulletAI
            </span>
          </div>
          <p className="mt-2 text-sm text-center sm:text-left text-theme-primary">
            {t("copyright")}
          </p>
        </div>
        <div
          className={`mt-8 sm:mt-0 text-center sm:text-right ${getRevealClass(isVisible)}`}
          style={{ transitionDelay: isVisible ? "120ms" : "0ms" }}
        >
          <button
            onClick={() => router.push("/contact")}
            className="font-semibold hover:text-orange-400 transition-colors cursor-pointer"
          >
            {t("contactUs")}
          </button>
        </div>
      </div>
      <button
        onClick={scrollToTop}
        className="fixed bottom-10 right-10 z-50 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] p-3 text-[var(--color-text-on-primary)] shadow-sm transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
        aria-label={t("back")}
      >
        <ArrowUp className="h-6 w-6" />
      </button>
    </footer>
  );
}
