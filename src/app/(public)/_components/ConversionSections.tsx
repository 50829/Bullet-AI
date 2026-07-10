"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getRevealClass,
  useScrollReveal,
} from "@/app/(public)/_hooks/useReveal";
import { useLanguage } from "@/shared/i18n/LanguageContext";

export function PricingSection() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const { t } = useLanguage();
  const features = [0, 1, 2, 3, 4].map((index) =>
    t(`pricingFeatures[${index}]`),
  );

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className={`lg:col-span-1 ${getRevealClass(isVisible)}`}>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight whitespace-pre-line text-theme-primary">
            {t("suitableForEveryone")}
          </h2>
          <p className="mt-4 text-xl text-gray-600 whitespace-pre-line">
            {t("pricingDescription")}
          </p>
        </div>
        <div
          className={`lg:col-span-2 flex items-center justify-center ${getRevealClass(isVisible)}`}
          style={{ transitionDelay: isVisible ? "140ms" : "0ms" }}
        >
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-8 rounded-3xl shadow-lg w-full max-w-md hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
            <PricingCard
              name={t("freeStart")}
              description={t("pricingDescription")}
              features={features}
              buttonText={t("getStarted")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  description,
  features,
  buttonText,
}: {
  name: string;
  description: string;
  features: string[];
  buttonText: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col p-0 rounded-2xl shadow-none w-full">
      <h3 className="text-4xl font-bold text-theme-primary">{name}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
      <ul className="mt-8 space-y-4 flex-grow">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-0.5">
              <Check className="h-4 w-4 text-blue-600" />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => router.push("/login")}
        className="mt-8 flex h-14 w-full items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-4 text-lg font-semibold text-[var(--color-text-on-primary)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
      >
        {buttonText}
      </button>
    </div>
  );
}

export function CallToActionSection() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <section ref={ref} className="py-4 px-4">
      <div className="max-w-4xl mx-auto">
        <div
          className={`bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-12 rounded-3xl text-center shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-500 ${getRevealClass(isVisible)}`}
        >
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-theme-primary">
            {t("startYourStory")}
          </h2>
          <p className="mt-4 text-xl text-gray-600">{t("storyDescription")}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-12 inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-10 py-4 text-lg font-semibold text-[var(--color-text-on-primary)] shadow-sm transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
          >
            {t("startNow")} <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
