"use client";

import React, { type ReactNode } from 'react';
import type { NextPage } from 'next';
import { Sparkles, Camera, Target, Lightbulb, Check, ArrowRight, ArrowUp, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './context/LanguageContext';

type FeatureItem = {
  icon: ReactNode;
  title: string;
  description: string;
};

const LandingPage: NextPage = () => {
  const [isVisible, setIsVisible] = useState({
    hero: false,
    pricing: false,
    cta: false,
    footer: false
  });

  useEffect(() => {
    const heroTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, hero: true })), 100);
    const pricingTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, pricing: true })), 500);
    const ctaTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, cta: true })), 700);
    const footerTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, footer: true })), 900);

    return () => {
      clearTimeout(heroTimer);
      clearTimeout(pricingTimer);
      clearTimeout(ctaTimer);
      clearTimeout(footerTimer);
    };
  }, []);

  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[#efeeeb]">
      <div className="absolute inset-0 overflow-y-auto">
        <div ref={topRef} />
        <main>
          <HeroSection isVisible={isVisible.hero} />
          <FeaturesSection />
          <div className="-mt-20">
            <PricingSection />
            <CallToActionSection />
          </div>
        </main>
        <Footer scrollToTop={scrollToTop} />
      </div>
    </div>
  );
};

const HeroSection = ({ isVisible }: { isVisible: boolean }) => {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  
  const goToLogin = () => {
    router.push('/login');
  };

  return (
    <section className={`relative z-10 flex flex-col items-center justify-center p-4 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="absolute top-4 left-4 flex items-center gap-3 z-20">
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
          <Sparkles className="h-6 w-6 text-gray-700" />
        </div>
        <span className="text-xl font-bold text-theme-primary">BulletAI</span>
      </div>

      <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
        <button
          onClick={() => setLanguage("en")}
          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
            language === "en" 
              ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]" 
              : "text-gray-500 hover:text-amber-500"
          }`}
        >
          <Globe className="w-3 h-3" />
          <span>EN</span>
        </button>
        <span className="text-gray-400 text-xs">|</span>
        <button
          onClick={() => setLanguage("zh")}
          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
            language === "zh" 
              ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]" 
              : "text-gray-500 hover:text-amber-500"
          }`}
        >
          <Globe className="w-3 h-3" />
          <span>中文</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto pt-12 pb-20 min-h-[75vh]">
        <h1 className={`text-6xl md:text-7xl font-bold text-theme-primary tracking-tight transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {t("heroTitle")}
        </h1>
        
        <div className={`mt-4 flex justify-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <p className="text-2xl md:text-3xl text-gray-600">{t("slogan")}</p>
        </div>
        
        <div className={`mt-10 flex flex-col sm:flex-row gap-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <button 
            onClick={goToLogin}
            className="flex h-14 min-w-[200px] items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-10 py-4 text-lg font-semibold text-[var(--color-text-on-primary)] shadow-sm transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
          >
            {t("getStarted")}
          </button>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const { t, language } = useLanguage();

  const features: FeatureItem[] = [
    {
      icon: <Camera className="h-7 w-7 text-gray-700" />,
      title: t("moments"),
      description: t("momentsDescription"),
    },
    {
      icon: <Target className="h-7 w-7 text-gray-700" />,
      title: t("goals"),
      description: t("goalsDescription"),
    },
    {
      icon: <Lightbulb className="h-7 w-7 text-gray-700" />,
      title: t("insights"),
      description: t("insightsDescription"),
    },
    {
      icon: <Check className="h-7 w-7 text-gray-700" />,
      title: t("habit"),
      description: language === "en" ? "Small routines stay visible beside each day" : "把长期的小行动放在每天看得见的位置",
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-theme-primary">{t("coreFeatures")}</h2>
          <p className="mt-4 text-xl text-gray-600">{t("featuresDescription")}</p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="pointer-events-none absolute inset-0 hidden md:block">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-orange-100 via-orange-200 to-orange-100" />
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-12 px-0 md:px-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative flex flex-col justify-center items-start p-4 md:p-6 rounded-3xl overflow-hidden"
              >
                <div className="relative w-full h-full min-h-[200px] flex items-center justify-center">
                  <div className="flex flex-col justify-center items-center text-center p-6 md:p-8">
                    <div className="mb-6">
                      <div className="bg-white/70 p-4 rounded-full flex-shrink-0 shadow-sm">
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold text-theme-primary mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-lg md:text-xl max-w-md leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};


const PricingSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const section = sectionRef.current;

    if (section) {
      observer.observe(section);
    }

    return () => {
      if (section) {
        observer.unobserve(section);
      }
    };
  }, [isVisible]);

  const tier = {
    name: t("freeStart"),
    price: null,
    description: t("pricingDescription"),
    features: [
      t("pricingFeatures[0]"),
      t("pricingFeatures[1]"),
      t("pricingFeatures[2]"),
      t("pricingFeatures[3]"),
      t("pricingFeatures[4]"),
    ],
    buttonText: t("getStarted"),
    isFeatured: true,
  };

  return (
    <section ref={sectionRef} className={`py-20 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className={`lg:col-span-1 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight whitespace-pre-line text-theme-primary">{t("suitableForEveryone")}</h2>
          <p className="mt-4 text-xl text-gray-600 whitespace-pre-line">{t("pricingDescription")}</p>
        </div>
        <div className="lg:col-span-2 flex items-center justify-center">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-8 rounded-3xl shadow-lg w-full max-w-md hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
            <PricingCard {...tier} />
          </div>
        </div>
      </div>
    </section>
  );
};

const PricingCard = ({ name, description, features, buttonText, isFeatured }: {
  name: string; description: string; features: string[]; buttonText: string; isFeatured: boolean;
}) => {
  const router = useRouter();

  const goToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="flex flex-col p-0 rounded-2xl shadow-none w-full">
      <h3 className="text-4xl font-bold text-theme-primary">{name}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
      <ul className="mt-8 space-y-4 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <div className={`rounded-full p-0.5 ${isFeatured ? 'bg-blue-100' : 'bg-green-100'}`}>
              <Check className={`h-4 w-4 ${isFeatured ? 'text-blue-600' : 'text-green-600'}`} />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button 
        onClick={goToLogin}
        className="mt-8 flex h-14 w-full items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-4 text-lg font-semibold text-[var(--color-text-on-primary)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
      >
        {buttonText}
      </button>
    </div>
  );
};

const CallToActionSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const section = sectionRef.current;

    if (section) {
      observer.observe(section);
    }

    return () => {
      if (section) {
        observer.unobserve(section);
      }
    };
  }, [isVisible]);

  const router = useRouter();

  const goToLogin = () => {
    router.push('/login');
  };

  return (
    <section ref={sectionRef} className={`py-4 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-12 rounded-3xl text-center shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-theme-primary">{t("startYourStory")}</h2>
          <p className="mt-4 text-xl text-gray-600">{t("storyDescription")}</p>
          <button 
            onClick={goToLogin}
            className="mt-12 inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-10 py-4 text-lg font-semibold text-[var(--color-text-on-primary)] shadow-sm transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
          >
            {t("startNow")} <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

const Footer = ({ scrollToTop }: { scrollToTop: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const section = sectionRef.current;

    if (section) {
      observer.observe(section);
    }

    return () => {
      if (section) {
        observer.unobserve(section);
      }
    };
  }, [isVisible]);

  return (
    <footer ref={sectionRef} className={`relative py-12 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-gray-600">
        <div className={`flex flex-col items-center sm:items-start transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
                <Sparkles className="h-6 w-6 text-gray-700"/>
            </div>
            <span className="font-bold text-xl text-theme-primary">BulletAI</span>
          </div>
          <p className="mt-2 text-sm text-center sm:text-left text-theme-primary">{t("copyright")}</p>
        </div>
        <div className={`mt-8 sm:mt-0 text-center sm:text-right transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <button
            onClick={() => router.push('/contact')}
            className="font-semibold hover:text-orange-400 transition-colors cursor-pointer"
          >
            {t("contactUs")}
          </button>
        </div>
      </div>
      <button 
        onClick={scrollToTop}
        className="fixed bottom-10 right-10 z-50 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] p-3 text-[var(--color-text-on-primary)] shadow-sm transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
        aria-label="返回顶部"
      >
        <ArrowUp className="h-6 w-6" />
      </button>
    </footer>
  );
};

export default LandingPage;
