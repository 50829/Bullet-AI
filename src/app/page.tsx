// app/page.tsx
"use client";

import type { NextPage } from 'next';
import { Sparkles, ArrowDown, Camera, Target, Lightbulb, Bot, Check, ArrowRight, ArrowUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// 主页面组件
const LandingPage: NextPage = () => {
  const [isVisible, setIsVisible] = useState({
    hero: false,
    features: false,
    pricing: false,
    cta: false,
    footer: false
  });

  useEffect(() => {
    const heroTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, hero: true })), 100);
    const featuresTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, features: true })), 300);
    const pricingTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, pricing: true })), 500);
    const ctaTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, cta: true })), 700);
    const footerTimer = setTimeout(() => setIsVisible(prev => ({ ...prev, footer: true })), 900);

    return () => {
      clearTimeout(heroTimer);
      clearTimeout(featuresTimer);
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
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-white to-orange-100">
      {/* 2. 滚动内容层 */}
      <div className="absolute inset-0 overflow-y-auto">
        {/* 在内容最顶部添加一个空 div 作为滚动目标 */}
        <div ref={topRef} />
        <main>
          <HeroSection isVisible={isVisible.hero} scrollToTop={scrollToTop} /> {/* 传递函数到 HeroSection */}
          <FeaturesSection />
          <PricingSection />
          <CallToActionSection />
        </main>
        <Footer scrollToTop={scrollToTop} /> {/* 传递函数到 Footer */}
      </div>
    </div>
  );
};

// 1. 顶部英雄区域 - 移除背景类，因为背景由父级提供
const HeroSection = ({ isVisible, scrollToTop }: { isVisible: boolean, scrollToTop: () => void }) => {
  const router = useRouter();
  
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  const slogan = "每一个灵魂，都值得被记录";
  const [sloganVisible, setSloganVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const sloganTimer = setTimeout(() => setSloganVisible(true), 1000);
      const buttonsTimer = setTimeout(() => setButtonsVisible(true), 2000);
      
      return () => {
        clearTimeout(sloganTimer);
        clearTimeout(buttonsTimer);
      };
    } else {
      setSloganVisible(false);
      setButtonsVisible(false);
    }
  }, [isVisible]);

  return (
    <section className={`min-h-screen flex flex-col items-center justify-center p-4 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="flex flex-col items-center max-w-4xl w-full">
        <div className={`bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200 mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <Sparkles className="h-10 w-10 text-gray-700" />
        </div>
        <h1 className={`text-7xl md:text-8xl font-bold text-gray-800 tracking-tight transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>BulletAI</h1>
        
        <div className="mt-4 flex justify-center">
          {sloganVisible ? (
            <div className="text-2xl md:text-3xl text-gray-600 flex flex-wrap justify-center">
              {slogan.split('').map((char, index) => (
                <span 
                  key={index} 
                  className="inline-block"
                  style={{ 
                    opacity: 0,
                    animation: `fadeInUp 0.8s ${index * 0.15}s forwards`,
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-2xl md:text-3xl text-gray-600 opacity-0">每一个灵魂，都值得被记录</p>
          )}
        </div>
        
        <div className={`mt-10 flex flex-col sm:flex-row gap-4 transition-all duration-1000 ${buttonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <button 
            onClick={goToLogin}
            className="bg-gray-800 text-white font-semibold py-4 px-10 rounded-full shadow-lg hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800 transition-all duration-500 text-lg min-w-[200px] h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl"
          >
            开始记录
          </button>
          <button 
            onClick={scrollToFeatures}
            className="bg-white text-gray-800 font-semibold py-4 px-10 rounded-full shadow-lg transition-all duration-500 text-lg min-w-[200px] h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl"
          >
            了解更多
          </button>
        </div>
      </div>
      {/* 修改点击事件，调用传递下来的 scrollToTop 函数 */}
      <div className="absolute bottom-10 animate-bounce" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
        <ArrowDown className="h-6 w-6 text-gray-500" />
      </div>
    </section>
  );
};

// 2. 四大核心功能区域 - 移除背景类
const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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

  const features = [
    {
      icon: <Camera className="h-7 w-7 text-gray-700" />,
      title: '我的时刻',
      description: '记录日常点滴，珍藏生活瞬间的专属日记',
      items: [
        '多媒体记录: 支持文字、图片、视频，让回忆更生动',
        '智能标记: 自定义事件类型（如生活、工作、旅行）与地理位置',
        '习惯打卡关联: 发布时刻时可关联“我的习惯”自动打卡',
        '自由编辑: 随时删除或修改已发布的时刻',
        '高效检索: 通过关键词或事件类型快速筛选回顾',
      ],
    },
    {
      icon: <Target className="h-7 w-7 text-gray-700" />,
      title: '我的目标',
      description: '清晰规划任务与梦想，从每日待办到长期目标',
      items: [
        '今日待办: 添加任务、设置优先级、标记完成状态',
        '近期目标: 设定中期或长期目标并追踪进度',
        '我的习惯: 创建习惯、设定频率、统计打卡次数',
        '灵活管理: 随时编辑或删除任务、目标与习惯',
      ],
    },
    {
      icon: <Lightbulb className="h-7 w-7 text-gray-700" />,
      title: '我的感悟',
      description: '沉淀灵感与思考，打造你的私人思想库',
      items: [
        '深度记录: 支持文字、图片、视频记录感悟',
        '背景信息: 标注事件类型、灵感来源与地点',
        '自由编辑: 所有感悟均可随时修改或删除',
        '快速查找: 通过关键词搜索过往灵感',
      ],
    },
    {
      icon: <Bot className="h-7 w-7 text-gray-700" />,
      title: 'AI树洞',
      description: '你的私密智能伙伴，懂你、陪你、启发你',
      items: [
        '个性化对话: 基于你所有记录进行深度理解与回应',
        '情感支持: 以温暖、共情的方式倾听与陪伴',
        '智能洞察: 回顾过往，提供成长视角与新思考',
        '绝对私密: 所有数据仅限你与AI使用，安全无忧',
      ],
    },
  ];

  return (
    <section id="features-section" ref={sectionRef} className={`py-20 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight">四大核心功能</h2>
          <p className="mt-4 text-xl text-gray-600">全方位记录、规划、思考，让 AI 成为你的成长伙伴</p>
        </div>
        <div className="flex flex-col gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-8 rounded-3xl shadow-lg border border-orange-200 hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
                <FeatureCard {...feature} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon, title, description, items }: { icon: React.ReactNode; title: string; description: string; items: string[] }) => (
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

// 3. 定价方案区域 - 移除背景类
const PricingSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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
    name: '免费开始',
    price: null,
    description: '体验 BulletAI 全部核心功能，开启你的成长之旅',
    features: [
      '我的时刻：完整记录与管理',
      '我的目标：任务、目标与习惯追踪',
      '我的感悟：灵感沉淀与回顾',
      'AI树洞：私密智能对话与洞察',
      '多媒体支持：文字、图片、视频',
      '标签分类与关键词搜索',
    ],
    buttonText: '立即开始',
    isFeatured: true,
  };

  return (
    <section ref={sectionRef} className={`py-20 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className={`lg:col-span-1 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight">适合每个人的起点</h2>
          <p className="mt-4 text-xl text-gray-600">无需付费，立即使用全部核心功能，开启属于你的记录与成长之旅</p>
        </div>
        <div className="lg:col-span-2 flex items-center justify-center">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-8 rounded-3xl shadow-lg border border-orange-200 w-full max-w-md hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
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
      <h3 className="text-4xl font-bold">{name}</h3>
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
        className="mt-8 w-full text-lg font-semibold py-4 px-4 rounded-full bg-gray-800 text-white hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800 transition-all duration-500 h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl"
      >
        {buttonText}
      </button>
    </div>
  );
};

// 4. 最终行动号召区域 - 移除背景类
const CallToActionSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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
    <section ref={sectionRef} className={`py-24 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-12 rounded-3xl text-center shadow-lg border border-orange-200 hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight">开始记录您的故事</h2>
          <p className="mt-4 text-xl text-gray-600">让每一个想法、每一次成长、每一刻感动都被珍藏</p>
          <button 
            onClick={goToLogin}
            className="mt-12 bg-gray-800 text-white font-semibold py-4 px-10 rounded-full shadow-lg hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800 transition-all duration-500 inline-flex items-center gap-2 text-lg h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl"
          >
            立即开始 <ArrowRight className="h-5 w-5" />
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

  // scrollToTop 现在通过 props 从父组件接收
  // const scrollToTop = () => {
  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // };
  
  return (
    <footer ref={sectionRef} className={`relative py-12 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-gray-600">
        <div className={`flex flex-col items-center sm:items-start transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-2 rounded-3xl shadow-lg border border-orange-200">
                <Sparkles className="h-6 w-6 text-gray-700"/>
            </div>
            <span className="font-bold text-xl">BulletAI</span>
          </div>
          <p className="mt-2 text-sm text-center sm:text-left">© 2025 BulletAI. 每一个灵魂，都值得被记录</p>
        </div>
        <div className={`mt-8 sm:mt-0 text-center sm:text-right transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h4 className="font-semibold">联系我们</h4>
        </div>
      </div>
      <button 
        onClick={scrollToTop} // 使用从父组件传递下来的函数
        className="fixed bottom-10 right-10 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800 transition-all duration-500 z-50 hover:-translate-y-1 hover:shadow-xl"
        aria-label="返回顶部"
      >
        <ArrowUp className="h-6 w-6" />
      </button>
    </footer>
  );
};

export default LandingPage;