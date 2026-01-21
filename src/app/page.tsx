// app/page.tsx
"use client";

import React, { type ReactNode } from 'react';
import type { NextPage } from 'next';
import { Sparkles, Camera, Target, Lightbulb, Bot, Check, ArrowRight, ArrowUp, Globe, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon for fallback
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './context/LanguageContext';
import Image from 'next/image'; // Import Next.js Image component

// 定义功能项的类型
type FeatureItem = {
  icon: ReactNode;
  title: string;
  description: string;
  items: string[];
  imagePath: string;
};

// 主页面组件
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

  // 添加一个 ref 来引用页面顶部
  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    // 1. 固定背景层
    <div className="relative h-screen overflow-hidden bg-[#efeeeb]">
      {/* 2. 滚动内容层 */}
      <div className="absolute inset-0 overflow-y-auto">
        {/* 在内容最顶部添加一个空 div 作为滚动目标 */}
        <div ref={topRef} />
        <main>
          <HeroSection isVisible={isVisible.hero} scrollToTop={scrollToTop} /> {/* 传递函数到 HeroSection */}
          
          {/* Features 部分将在这里开始，现在没有视频了 */}
          <FeaturesSection />

          {/* Pricing 和其余部分保持原有逻辑 */}
          <div className="-mt-20"> {/* Adjust this margin if needed after adding video */}
            <PricingSection />
            {/* 调整 CTA 部分的间距，拉近与上方标题的距离 */}
            <CallToActionSection />
          </div>
        </main>
        <Footer scrollToTop={scrollToTop} /> {/* 传递函数到 Footer */}
      </div>
    </div>
  );
};

// 1. 顶部英雄区域 - 修改后的 HeroSection
const HeroSection = ({ isVisible, scrollToTop }: { isVisible: boolean, scrollToTop: () => void }) => {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  
  const goToLogin = () => {
    router.push('/login');
  };

  // 移除独立的动画状态，使用 isVisible 统一控制

  return (
    // 减少最小高度，让内容更紧凑，并允许与其他部分重叠
    <section className={`relative z-10 flex flex-col items-center justify-center p-4 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      {/* 保留 Logo 和标题在左上角 */}
      <div className="absolute top-4 left-4 flex items-center gap-3 z-20">
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
          <Sparkles className="h-6 w-6 text-gray-700" />
        </div>
        <span className="text-xl font-bold text-theme-primary">BulletAI</span>
      </div>

      {/* 保留语言切换在右上角 */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
        <button
          onClick={() => setLanguage("en")}
          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
            language === "en" 
              ? "bg-[#003049] text-white" 
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
              ? "bg-[#003049] text-white" 
              : "text-gray-500 hover:text-amber-500"
          }`}
        >
          <Globe className="w-3 h-3" />
          <span>中文</span>
        </button>
      </div>

      {/* 内容容器 - 包含居中的大标题、Slogan 和按钮 */}
      {/* 修改：增加 min-height 和 pt 值，让 Hero 部分更高，内容往下挪，同时让下方标题露出一半 */}
      <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto pt-12 pb-20 min-h-[75vh]"> {/* 调整：min-h-[75vh] 和 pt-12 */}
        {/* 新增：原来的黑色大标题，居中放置 */}
        <h1 className={`text-6xl md:text-7xl font-bold text-theme-primary tracking-tight transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {t("heroTitle")}
        </h1>
        
        {/* Slogan 居中 */}
        <div className={`mt-4 flex justify-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <p className="text-2xl md:text-3xl text-gray-600">{t("slogan")}</p>
        </div>
        
        {/* 按钮居中 */}
        <div className={`mt-10 flex flex-col sm:flex-row gap-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <button 
            onClick={goToLogin}
            className="bg-[#003049] text-white font-semibold py-4 px-10 rounded-full shadow-lg hover:bg-transparent hover:text-[#003049] hover:border-2 border-[#003049] transition-all duration-500 text-lg min-w-[200px] h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl"
          >
            {t("getStarted")}
          </button>
          {/* 移除了 "Learn More" 按钮 */}
        </div>
      </div>
      
      {/* 移除了底部的跳动箭头 */}
      
    </section>
  );
};

// 2. 四大核心功能区域 - 2x2网格布局，默认显示文字，悬停显示图片
const FeaturesSection = () => {
  const { t } = useLanguage();

  // 定义功能数组，明确类型
  const features: FeatureItem[] = [
    {
      icon: <Camera className="h-7 w-7 text-gray-700" />,
      title: t("moments"),
      description: t("momentsDescription"),
      items: [
        t("momentsItems[0]"),
        t("momentsItems[1]"),
        t("momentsItems[2]"),
      ],
      imagePath: "/moments.png",
    },
    {
      icon: <Target className="h-7 w-7 text-gray-700" />,
      title: t("goals"),
      description: t("goalsDescription"),
      items: [
        t("goalsItems[0]"),
        t("goalsItems[1]"),
        t("goalsItems[2]"),
        t("goalsItems[3]"),
      ],
      imagePath: "/moments.png", // 可以根据需要替换为对应的图片路径
    },
    {
      icon: <Lightbulb className="h-7 w-7 text-gray-700" />,
      title: t("insights"),
      description: t("insightsDescription"),
      items: [
        t("insightsItems[0]"),
        t("insightsItems[1]"),
        t("insightsItems[2]"),
      ],
      imagePath: "/moments.png", // 可以根据需要替换为对应的图片路径
    },
    {
      icon: <Bot className="h-7 w-7 text-gray-700" />,
      title: t("aiEmpowerment"),
      description: t("aiEmpowermentDescription"),
      items: [
        t("aiEmpowermentItems[0]"),
        t("aiEmpowermentItems[1]"),
        t("aiEmpowermentItems[2]"),
        t("aiEmpowermentItems[3]"),
      ],
      imagePath: "/moments.png", // 可以根据需要替换为对应的图片路径
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-theme-primary">{t("coreFeatures")}</h2>
          <p className="mt-4 text-xl text-gray-600">{t("featuresDescription")}</p>
        </div>

        {/* 十字四象限布局：中间用细线分成四块，保留悬浮图片效果 */}
        <div className="relative max-w-6xl mx-auto">
          {/* 十字分割线：使用与卡片 hover 相同色系的柔和线条，仅在中大屏显示 */}
          <div className="pointer-events-none absolute inset-0 hidden md:block">
            {/* 竖线 */}
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-orange-100 via-orange-200 to-orange-100" />
            {/* 横线 */}
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-12 px-0 md:px-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="relative flex flex-col justify-center items-start p-4 md:p-6 rounded-3xl overflow-hidden"
              >
                <div className="relative w-full h-full min-h-[200px] flex items-center justify-center">
                  {/* 显示：标题和描述 */}
                  <div className="flex flex-col justify-center items-center text-center p-6 md:p-8">
                    {/* 图标 */}
                    <div className="mb-6">
                      <div className="bg-white/70 p-4 rounded-full flex-shrink-0 shadow-sm">
                        {feature.icon}
                      </div>
                    </div>
                    {/* 标题 */}
                    <h3 className="text-3xl md:text-4xl font-bold text-theme-primary mb-4">
                      {feature.title}
                    </h3>
                    {/* 描述 */}
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


const FeatureCard = ({ icon, title, description, items }: FeatureItem) => { // 明确指定 props 类型
  const { t } = useLanguage();
  // 移除动画类，直接渲染内容
  return (
    <div className="bg-transparent p-0 rounded-2xl shadow-none">
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-slate-100 p-3 rounded-full">
          {icon}
        </div>
        <div>
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="text-gray-500">{description}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {items.map((item, index) => {
          const parts = item.split(':');
          return (
            <li key={index} className="flex items-start">
              <span className="font-semibold">{parts[0]}:</span>
              {parts.length > 1 && ` ${parts[1]}`}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// 3. 定价方案区域 - 移除背景类
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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
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
  const { t } = useLanguage();

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
        className="mt-8 w-full text-lg font-semibold py-4 px-4 rounded-full bg-[#003049] text-white hover:bg-transparent hover:text-[#003049] hover:border-2 border-[#003049] transition-all duration-500 h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl"
      >
        {buttonText}
      </button>
    </div>
  );
};

// 4. 最终行动号召区域 - 移除背景类，进一步调整间距
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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isVisible]);

  const router = useRouter();

  const goToLogin = () => {
    router.push('/login');
  };

  return (
    // 修改：将 py-8 改为 py-4，进一步拉近距离
    <section ref={sectionRef} className={`py-4 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-12 rounded-3xl text-center shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-theme-primary">{t("startYourStory")}</h2>
          <p className="mt-4 text-xl text-gray-600">{t("storyDescription")}</p>
          <button 
            onClick={goToLogin}
            className="mt-12 bg-[#003049] text-white font-semibold py-4 px-10 rounded-full shadow-lg hover:bg-transparent hover:text-[#003049] hover:border-2 border-[#003049] transition-all duration-500 inline-flex items-center gap-2 text-lg h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl"
          >
            {t("startNow")} <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

// Footer 组件 - 移除背景类
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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
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
        onClick={scrollToTop} // 使用从父组件传递下来的函数
        className="fixed bottom-10 right-10 bg-[#003049] text-white p-3 rounded-full shadow-lg hover:bg-transparent hover:text-[#003049] hover:border-2 border-[#003049] transition-all duration-500 z-50 hover:-translate-y-1 hover:shadow-xl"
        aria-label="返回顶部"
      >
        <ArrowUp className="h-6 w-6" />
      </button>
    </footer>
  );
};

export default LandingPage;