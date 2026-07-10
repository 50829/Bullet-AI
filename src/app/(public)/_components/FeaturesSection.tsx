"use client";

import {
  Camera,
  Check,
  Lightbulb,
  Target,
  type LucideIcon,
} from "lucide-react";

import {
  getRevealClass,
  useScrollReveal,
} from "@/app/(public)/_hooks/useReveal";
import { useLanguage } from "@/shared/i18n/LanguageContext";

type FeatureItem = {
  Icon: LucideIcon;
  title: string;
  description: string;
};

export function FeaturesSection() {
  const { t, language } = useLanguage();
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const features: FeatureItem[] = [
    { Icon: Camera, title: t("moments"), description: t("momentsDescription") },
    { Icon: Target, title: t("goals"), description: t("goalsDescription") },
    {
      Icon: Lightbulb,
      title: t("insights"),
      description: t("insightsDescription"),
    },
    {
      Icon: Check,
      title: t("habit"),
      description:
        language === "en"
          ? "Small routines stay visible beside each day"
          : "把长期的小行动放在每天看得见的位置",
    },
  ];

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 ${getRevealClass(isVisible)}`}>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-theme-primary">
            {t("coreFeatures")}
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            {t("featuresDescription")}
          </p>
        </div>
        <div
          className={`relative max-w-6xl mx-auto ${getRevealClass(isVisible)}`}
          style={{ transitionDelay: isVisible ? "120ms" : "0ms" }}
        >
          <div className="pointer-events-none absolute inset-0 hidden md:block">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-orange-100 via-orange-200 to-orange-100" />
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-12 px-0 md:px-4">
            {features.map(({ Icon, title, description }, index) => (
              <div
                key={title}
                className={`relative flex min-h-[200px] flex-col items-center justify-center overflow-hidden rounded-3xl p-4 text-center md:p-6 ${getRevealClass(isVisible)}`}
                style={{
                  transitionDelay: isVisible ? `${220 + index * 70}ms` : "0ms",
                }}
              >
                <div className="mb-6 rounded-full bg-white/70 p-4 shadow-sm">
                  <Icon className="h-7 w-7 text-gray-700" />
                </div>
                <h3 className="mb-4 text-3xl font-bold text-theme-primary md:text-4xl">
                  {title}
                </h3>
                <p className="max-w-md text-lg leading-relaxed text-gray-600 md:text-xl">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
