"use client";

import { useRef } from "react";

import {
  CallToActionSection,
  PricingSection,
} from "@/app/(public)/_components/ConversionSections";
import { FeaturesSection } from "@/app/(public)/_components/FeaturesSection";
import { HeroSection } from "@/app/(public)/_components/HeroSection";
import { LandingFooter } from "@/app/(public)/_components/LandingFooter";
import { useIntroReveal } from "@/app/(public)/_hooks/useReveal";

export default function LandingPage() {
  const introVisible = useIntroReveal();
  const topRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-screen overflow-hidden bg-[#efeeeb]">
      <div className="absolute inset-0 overflow-y-auto">
        <div ref={topRef} />
        <main>
          <HeroSection isVisible={introVisible} />
          <FeaturesSection />
          <div className="-mt-20">
            <PricingSection />
            <CallToActionSection />
          </div>
        </main>
        <LandingFooter
          scrollToTop={() =>
            topRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>
    </div>
  );
}
