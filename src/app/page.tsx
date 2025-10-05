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
    // 依次显示各个部分，创造淡入效果
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

  return (
    <div className="bg-gradient-to-br from-blue-100 via-white to-orange-100 text-gray-800 font-sans min-h-screen">
      <main>
        <HeroSection isVisible={isVisible.hero} />
        <FeaturesSection />
        <PricingSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
};

// 1. 顶部英雄区域
const HeroSection = ({ isVisible }: { isVisible: boolean }) => {
  const router = useRouter();
  
  // 滚动到功能区域
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 跳转到登录页面
  const goToLogin = () => {
    router.push('/login');
  };

  // Slogan动画效果
  const slogan = "每一个灵魂，都值得被记录";
  const [sloganVisible, setSloganVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const sloganTimer = setTimeout(() => setSloganVisible(true), 1000); // 延长延迟时间
      const buttonsTimer = setTimeout(() => setButtonsVisible(true), 2000); // 延长延迟时间
      
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
    <section className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-orange-100 p-4 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="flex flex-col items-center max-w-4xl w-full">
        <div className={`bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-md mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
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
      <div className="absolute bottom-10 animate-bounce">
        <ArrowDown className="h-6 w-6 text-gray-500" />
      </div>
    </section>
  );
};

// 2. 四大核心功能区域
const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          observer.disconnect(); // 只播放一次动画
        }
      },
      { threshold: 0.1 } // 当10%的元素可见时触发
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
      description: '像发朋友圈一样记录生活，让每一个珍贵时刻都有迹可循',
      items: [
        '记录日常: 轻松记录文字与照片，分享生活瞬间',
        '习惯打卡: 关联习惯，一键标记完成状态',
        '地理位置: 记录您所在位置，让回忆更具体',
        '事件标签: 自定义标签分类，快速查找',
        '月度回顾: 自动归档，方便按月回顾',
        'AI 帮写: AI 助手提供灵感，让写作更轻松',
        '标签筛选: 通过标签快速找到特定主题',
      ],
    },
    {
      icon: <Target className="h-7 w-7 text-gray-700" />,
      title: '月度计划',
      description: '设定清晰目标，追踪进度，管理每月成就',
      items: [
        '设定目标: 为每月设定工作、学习、生活目标',
        '进度追踪: 直观的进度条和完成度百分比',
        'AI 灵思: AI 提供个性化目标建议',
      ],
    },
    {
      icon: <Lightbulb className="h-7 w-7 text-gray-700" />,
      title: '我的感悟',
      description: '记录思考洞察，追溯灵感来源，深化个人成长',
      items: [
        '记录思考: 随时记录所思所想，洞察顿悟',
        '灵感溯源: 记住感悟的来源和产生过程',
        '图片支持: 图文并茂呈现您的思考',
        '事件标签: 便于整理和回顾特定主题',
        '月度归档: 追溯思考脉络，见证成长',
        'AI 帮写: 协助撰写和深化感悟内容',
        '标签筛选: 聚焦特定类型的感悟',
      ],
    },
    {
      icon: <Bot className="h-7 w-7 text-gray-700" />,
      title: 'AI 管家',
      description: '您的专属智能助手，深度理解您，助力成长',
      items: [
        '智能对话: AI 阅读您所有记录，形成全面理解',
        '个性化建议: 提供高维度的个性化分析和建议',
        '未来展望: 获取对未来规划的洞察和支持',
      ],
    },
  ];

  return (
    <section id="features-section" ref={sectionRef} className={`py-20 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight">四大核心功能</h2>
          <p className="mt-4 text-xl text-gray-600">全方位记录、规划、思考，让 AI 成为您的成长伙伴</p>
        </div>
        <div className="flex flex-col gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${index * 150}ms` }} // 增加延迟时间
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

// 功能卡片子组件
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

// 3. 定价方案区域（左侧标题，右侧卡片）
const PricingSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          observer.disconnect(); // 只播放一次动画
        }
      },
      { threshold: 0.1 } // 当10%的元素可见时触发
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
    description: '体验 BulletAI 的核心功能，开启您的记录之旅',
    features: [
      '所有核心功能',
      '无限日记和感悟记录',
      '月度计划管理',
      '基础 AI 助手支持',
      '照片上传与存储',
      '标签分类与筛选',
    ],
    buttonText: '立即开始',
    isFeatured: true,
  };

  return (
    <section ref={sectionRef} className={`py-20 px-4 bg-gradient-to-br from-blue-100/50 via-white/50 to-orange-100/50 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className={`lg:col-span-1 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight">适合每个需求的定价方案</h2>
          <p className="mt-4 text-xl text-gray-600">从免费开始，随着成长逐步升级，获得更强大的功能支持</p>
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

// 定价卡片子组件
const PricingCard = ({ name, price, period, description, features, buttonText, isFeatured }: {
  name: string; price: string | null; period?: string; description: string; features: string[]; buttonText: string; isFeatured: boolean;
}) => {
  const router = useRouter();

  const goToLogin = () => {
    router.push('/login');
  };

  return (
    <div className={`flex flex-col p-0 rounded-2xl shadow-none w-full ${isFeatured ? 'bg-transparent' : 'bg-slate-50/50'}`}>
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
        className={`mt-8 w-full text-lg font-semibold py-4 px-4 rounded-full transition-all duration-500 ${isFeatured ? 'bg-gray-800 text-white hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800' : 'bg-gray-800 text-white hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800'} h-14 flex items-center justify-center hover:-translate-y-1 hover:shadow-xl`}
      >
        {buttonText}
      </button>
    </div>
  );
};

// 4. 最终行动号召区域
const CallToActionSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          observer.disconnect(); // 只播放一次动画
        }
      },
      { threshold: 0.1 } // 当10%的元素可见时触发
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

// Footer 组件
const Footer = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          observer.disconnect(); // 只播放一次动画
        }
      },
      { threshold: 0.1 } // 当10%的元素可见时触发
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

  // 返回顶部功能
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <footer ref={sectionRef} className={`relative py-12 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-gray-600">
        <div className={`flex flex-col items-center sm:items-start transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm">
                <Sparkles className="h-6 w-6 text-gray-700"/>
            </div>
            <span className="font-bold text-xl">BulletAI</span>
          </div>
          <p className="mt-2 text-sm text-center sm:text-left">© 2024 BulletAI. 每一个灵魂，都值得被记录</p>
        </div>
        <div className={`mt-8 sm:mt-0 text-center sm:text-right transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h4 className="font-semibold">联系我们</h4>
        </div>
      </div>
      {/* “返回顶部”按钮 */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-10 right-10 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800 transition-all duration-500 z-50 hover:-translate-y-1 hover:shadow-xl"
        aria-label="返回顶部"
      >
        <ArrowUp className="h-6 w-6" />
      </button>
    </footer>
  );
};

export default LandingPage;