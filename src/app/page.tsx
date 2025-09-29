
"use client";

import { useState, useEffect, type FC, type SVGProps } from 'react';
import {
  BrainCircuit,
  BookMarked,
  Globe,
  Check,
  Rocket,
  Target,
  PenTool,
  BookOpen,
  ArrowUp,
  Cpu,
  Sparkles,
  CalendarDays,
  ChevronDown,
  Menu
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Define a type for icon components for cleaner props
type IconComponent = FC<SVGProps<SVGSVGElement>>;

// -----------------------------------------------------------------------------
// Bilingual Content
// -----------------------------------------------------------------------------
const content = {
  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      resources: "Resources",
      language: "中文",
    },
    hero: {
      tagline: "AI-Powered Bullet Journal System",
      title: "Clearer Thinking,",
      titleHighlight: "Better Efficiency",
      description: "BulletAI combines the structured thinking of classic bullet journaling with AI assistance to create a personalized planning and recording system. From daily tasks to long-term goals, intelligently plan every step.",
      stats: {
        users: "30,000+",
        tasks: "5M+",
        regions: "50+",
      },
      statsLabels: {
        users: "Active Users",
        tasks: "Tasks Completed",
        regions: "Countries & Regions",
      },
      cta: "Start for Free →",
    },
    features: {
      title: "Complete Digital Bullet Journal Solution",
      items: [
        { 
          icon: BrainCircuit, 
          title: "AI Assistant", 
          description: "Tell BulletAI your ideas and it will transform them into a fully functional bullet journal system—complete with all necessary components, pages, processes, and features." 
        },
        { 
          icon: PenTool, 
          title: "Daily Log", 
          description: "What do you need to focus on today? Quickly record tasks, events, and ideas using the classic bullet symbol system, keeping each day clear and focused." 
        },
        { 
          icon: CalendarDays, 
          title: "Monthly Log", 
          description: "Plan your month, track progress, and ensure tasks align with your monthly goals. Auto-migration ensures you never miss important items." 
        },
        { 
          icon: Target, 
          title: "Future Log", 
          description: "Record long-term goals and future plans. The system will remind you at the right time, ensuring long-term goals aren't overshadowed by daily tasks." 
        },
        { 
          icon: BookOpen, 
          title: "Custom Notes", 
          description: "Record reflections, insights, and life moments anytime. AI helps organize and connect content, transforming scattered thoughts into valuable personal knowledge." 
        },
      ],
      cta: "Start Building →",
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Three Steps to Start Your Intelligent Planning Journey",
      steps: [
        { step: "01", icon: Rocket, title: "Create Your Digital Bullet Journal", description: "Choose a template or start from scratch, set personal preferences and goals." },
        { step: "02", icon: Cpu, title: "AI Assistant Learns Your Patterns", description: "After a few days of use, AI begins to understand your work habits and priorities." },
        { step: "03", icon: Target, title: "Enjoy an Intelligent Planning Experience", description: "Receive personalized suggestions, automated task management, and focus on what truly matters." },
      ],
    },
    pricing: {
      title: "Pricing Plans That Scale With You",
      subtitle: "Expand your plan as you grow to match your needs.",
      free: { 
        title: "Start Free", 
        features: ["Core logging features", "Basic AI suggestions", "Multi-device sync", "Basic data security"], 
        cta: "Start Building" 
      },
      paid: { 
        title: "Paid Plan", 
        price: "$29/month", 
        description: "Upgrade to unlock more AI features, enhanced support, and advanced capabilities.", 
        cta: "View All Plans" 
      },
    },
    testimonials: {
      title: "Praise from Users Worldwide",
      items: [
        { name: "Jing Wang", handle: "@jingwang_dev", avatar: "W", bgColor: "bg-purple-500", quote: "Finally found a digital bullet journal solution! The three-tier logging system keeps my planning organized." },
        { name: "Li Zhao", handle: "@zhaoli_startup", avatar: "Z", bgColor: "bg-orange-500", quote: "As an entrepreneur, time is money. BulletAI saves me significant planning time, letting me focus on business growth." },
        { name: "Fang Liu", handle: "@fangliu_writer", avatar: "L", bgColor: "bg-lime-500", quote: "Custom notes are my favorite feature—all inspiration and thoughts are perfectly organized." },
        { name: "Gleb Konon", handle: "@gleb_konon", avatar: "G", bgColor: "bg-red-500", quote: "Just built this awesome app with @bullet_ai! I'm blown away." },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about BulletAI",
      items: [
        { 
          question: "What is the Bullet Journal System?", 
          answer: "The Bullet Journal System is a methodology created by Ryder Carroll. It's a personal organization system that combines a task manager, notebook, diary, and planner. BulletAI digitizes this classic system with AI enhancement." 
        },
        { 
          question: "What can the AI assistant do for me?", 
          answer: "The AI assistant can help you automatically categorize tasks, suggest planning based on your habits, summarize your notes, and remind you of important long-term goals. It structures your scattered thoughts, letting you focus on execution." 
        },
        { 
          question: "Is my data secure?", 
          answer: "Absolutely secure. We use industry-standard end-to-end encryption to protect your data. Your privacy is our top priority, and we will never access or share your data without your explicit permission." 
        },
        { 
          question: "Can I migrate data from other tools?", 
          answer: "Yes, we currently support importing data from Todoist, Trello, and Notion. We're working to support more platforms for migration, allowing you to seamlessly switch to BulletAI." 
        },
        { 
          question: "Do you have a mobile app?", 
          answer: "We currently offer a feature-rich web app that works well on mobile browsers. Native iOS and Android apps are actively in development—stay tuned!" 
        },
        { 
          question: "What are the limitations of the free version?", 
          answer: "The free version includes all core logging features and basic AI suggestions, suitable for personal daily use. The paid version offers more advanced AI features, unlimited custom notes, team collaboration, and priority support." 
        },
      ],
    },
    finalCta: {
      title: "Ready to Start Your Intelligent Planning Journey?",
      subtitle: "Join 30,000+ users experiencing AI-powered bullet journaling",
      cta: "Start for Free →",
      benefits: [
        "30-day free trial",
        "No credit card required",
        "Cancel anytime"
      ]
    },
    footer: {
      company: "AI-powered bullet journal system, clearer thinking, better efficiency.",
      product: { title: "Product", items: ["Features", "Pricing", "Changelog"] },
      companySection: { title: "Company", items: ["About Us", "Join Us", "Blog"] },
      support: { title: "Support", items: ["Help Center", "Community", "Contact Us"] },
      copyright: "© 2025 BulletAI. All rights reserved.",
      legal: ["Privacy Policy", "Terms of Service", "Security"],
    },
  },
  zh: {
    nav: {
      features: "功能特色",
      pricing: "定价",
      resources: "资源",
      language: "EN",
    },
    hero: {
      tagline: "AI驱动的子弹笔记系统",
      title: "让思维更清晰,",
      titleHighlight: "让效率更出众",
      description: "BulletAI 结合经典子弹笔记的结构化思维与AI智能助手，为您打造个性化的规划与记录系统。从日常任务到长远目标，智能规划每一步。",
      stats: {
        users: "30,000+",
        tasks: "500万+",
        regions: "50+",
      },
      statsLabels: {
        users: "活跃用户",
        tasks: "任务已完成",
        regions: "国家和地区",
      },
      cta: "免费开始使用 →",
    },
    features: {
      title: "完整的数字化子弹笔记解决方案",
      items: [
        { 
          icon: BrainCircuit, 
          title: "AI 智能助手", 
          description: "告诉BulletAI您的想法，它会将其转化为一个功能完备的子弹笔记系统——包含所有必要的组件、页面、流程和功能。" 
        },
        { 
          icon: PenTool, 
          title: "Daily Log 日常记录", 
          description: "今日需要专注什么？快速记录任务、事件和想法，使用经典的子弹符号系统，让每一天都有清晰的焦点。" 
        },
        { 
          icon: CalendarDays, 
          title: "Monthly Log 月度规划", 
          description: "规划您的月份，追踪进度并确保任务与您的月度目标保持一致。自动迁移，永远不会遗漏重要事项。" 
        },
        { 
          icon: Target, 
          title: "Future Log 未来日志", 
          description: "记录长期目标和未来计划，系统会在合适时机提醒您，确保长远目标不会被日常琐事掩盖。" 
        },
        { 
          icon: BookOpen, 
          title: "Custom Notes 自定义笔记", 
          description: "随时记录反思、见解和生活瞬间。AI帮助整理和关联内容，将零散思维转化为有价值的个人知识库。" 
        },
      ],
      cta: "开始构建 →",
    },
    howItWorks: {
      title: "工作原理",
      subtitle: "三步开始您的智能规划之旅",
      steps: [
        { step: "01", icon: Rocket, title: "创建您的数字子弹笔记", description: "选择模板或从空白开始，设置个人偏好和目标。" },
        { step: "02", icon: Cpu, title: "AI助手学习您的模式", description: "使用几天后，AI开始理解您的工作习惯和优先级。" },
        { step: "03", icon: Target, title: "享受智能化的规划体验", description: "获得个性化建议，自动化任务管理，专注于真正重要的事情。" },
      ],
    },
    pricing: {
      title: "适合各种需求的定价方案",
      subtitle: "随着您的成长扩展您的计划，以匹配您的需求。",
      free: { 
        title: "免费开始", 
        features: ["核心日志功能", "AI基础建议", "多设备同步", "基础数据安全"], 
        cta: "开始构建" 
      },
      paid: { 
        title: "付费计划", 
        price: "¥ 29/月起", 
        description: "升级以获得更多AI功能、更强支持和高级特性。", 
        cta: "查看所有计划" 
      },
    },
    testimonials: {
      title: "来自全球用户的赞誉",
      items: [
        { name: "王静", handle: "@jingwang_dev", avatar: "W", bgColor: "bg-purple-500", quote: "终于找到了数字化的子弹笔记解决方案！三层日志系统让我的规划井井有条。" },
        { name: "赵力", handle: "@zhaoli_startup", avatar: "Z", bgColor: "bg-orange-500", quote: "作为创业者，时间就是金钱。BulletAI帮我节省了大量规划时间，让我能更专注于业务增长。" },
        { name: "刘芳", handle: "@fangliu_writer", avatar: "L", bgColor: "bg-lime-500", quote: "自定义笔记功能是我的最爱，所有的灵感和思考都能被完美地组织起来。" },
        { name: "Gleb Konon", handle: "@gleb_konon", avatar: "G", bgColor: "bg-red-500", quote: "Just built this awesome app with @bullet_ai! I'm blown away." },
      ],
    },
    faq: {
      title: "常见问题",
      subtitle: "关于BulletAI的一切疑问",
      items: [
        { 
          question: "什么是子弹笔记系统?", 
          answer: "子弹笔记系统是一种由 Ryder Carroll 创建的方法论。它是一种集成了任务管理器、笔记本、日记和计划书的个人组织系统。BulletAI 将这一经典系统数字化并用 AI 进行了增强。" 
        },
        { 
          question: "AI助手具体能帮我做什么?", 
          answer: "AI助手可以帮助您自动分类任务、根据您的习惯提出规划建议、总结您的笔记、并提醒您重要的长期目标。它能将您的零散想法结构化，让您更专注于执行。" 
        },
        { 
          question: "我的数据安全吗?", 
          answer: "绝对安全。我们采用行业标准的端到-end加密来保护您的数据。您的隐私是我们的首要任务，未经您的明确许可，我们绝不会访问或分享您的数据。" 
        },
        { 
          question: "可以从其他工具迁移数据吗?", 
          answer: "是的，我们目前支持从 Todoist、Trello 和 Notion 导入数据。我们正在努力支持更多平台的迁移，让您可以无缝切换到 BulletAI。" 
        },
        { 
          question: "有移动端应用吗?", 
          answer: "我们目前提供功能完善的 Web 应用，它在移动浏览器上也有很好的响应式体验。原生的 iOS 和 Android 应用正在积极开发中，敬请期待！" 
        },
        { 
          question: "免费版本有什么限制?", 
          answer: "免费版本包含了所有的核心日志功能和基础的AI建议，适合个人日常使用。付费版本提供更高级的AI功能、无限的自定义笔记、团队协作和优先支持。" 
        },
      ],
    },
    finalCta: {
      title: "准备开始您的智能规划之旅？",
      subtitle: "加入 30,000+ 用户，体验AI驱动的子弹笔记系统",
      cta: "免费开始使用 →",
      benefits: [
        "30天免费试用",
        "无需信用卡",
        "随时可以取消"
      ]
    },
    footer: {
      company: "AI驱动的子弹笔记系统，让思维更清晰，让效率更出众。",
      product: { title: "产品", items: ["功能特色", "定价方案", "更新日志"] },
      companySection: { title: "公司", items: ["关于我们", "加入我们", "博客"] },
      support: { title: "支持", items: ["帮助中心", "社区论坛", "联系我们"] },
      copyright: "© 2025 BulletAI. 保留所有权利。",
      legal: ["隐私政策", "使用条款", "安全说明"],
    },
  },
};

// -----------------------------------------------------------------------------
// Helper Component: Icon Wrapper
// -----------------------------------------------------------------------------
const IconWrapper: FC<{ icon: IconComponent; className?: string }> = ({ icon: Icon, className }) => (
  <div className={`flex items-center justify-center w-16 h-16 bg-orange-100 rounded-xl mb-6 ${className}`}>
    <Icon className="w-8 h-8 text-orange-500" />
  </div>
);

// -----------------------------------------------------------------------------
// Section 1: Header / Navigation (MODIFIED)
// -----------------------------------------------------------------------------
const Header = ({ lang, setLang }: { lang: 'en' | 'zh'; setLang: (lang: 'en' | 'zh') => void }) => {
  const t = content[lang];
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false); // Close mobile menu after clicking
    }
  };

  const handleGetStarted = () => {
    router.push('/login');
  };

  return (
    // Added text-white to ensure default font color is white
    <header className={`sticky top-0 z-50 transition-all duration-300 text-white ${
      isScrolled 
        ? 'bg-gray-900/80 backdrop-blur-lg border-b border-gray-700' 
        : 'bg-gray-900'
    }`}>
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <BookMarked className="w-8 h-8 text-orange-400" />
          <span className="text-2xl font-bold">BulletAI</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="hover:text-orange-400 transition-colors">{t.nav.features}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }} className="hover:text-orange-400 transition-colors">{t.nav.pricing}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('resources'); }} className="hover:text-orange-400 transition-colors">{t.nav.resources}</a>
        </nav>
        
        <div className="flex items-center space-x-4">
          {/* Language Toggle - Always visible on mobile */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            className="flex items-center space-x-1 hover:text-orange-400 transition-colors"
          >
            <Globe className="w-5 h-5" />
            <span className="hidden md:block">{t.nav.language}</span>
          </button>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Desktop Get Started Button */}
          <button 
            onClick={handleGetStarted}
            className="hidden md:block bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-5 rounded-lg transition-colors"
          >
            {lang === 'en' ? 'Get Started' : '开始使用'}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-800 py-4 px-6">
          <div className="flex flex-col space-y-4">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}
              className="hover:text-orange-400 transition-colors py-2"
            >
              {t.nav.features}
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}
              className="hover:text-orange-400 transition-colors py-2"
            >
              {t.nav.pricing}
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); scrollToSection('resources'); }}
              className="hover:text-orange-400 transition-colors py-2"
            >
              {t.nav.resources}
            </a>
            <button 
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="flex items-center space-x-1 hover:text-orange-400 transition-colors py-2 w-fit"
            >
              <Globe className="w-5 h-5" />
              <span>{t.nav.language}</span>
            </button>
            <button 
              onClick={handleGetStarted}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-5 rounded-lg transition-colors w-fit"
            >
              {lang === 'en' ? 'Get Started' : '开始使用'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

// -----------------------------------------------------------------------------
// Section 2: Hero
// -----------------------------------------------------------------------------
const Hero = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];
  const router = useRouter();

  return (
    <section id="hero" className="bg-gray-900 text-white text-center pt-20 pb-32">
      <div className="container mx-auto px-6">
        <div className="inline-flex items-center bg-gray-800 border border-gray-700 rounded-full px-4 py-1 mb-6">
          <Sparkles className="w-4 h-4 text-orange-400 mr-2" />
          <span className="text-sm font-medium">{t.hero.tagline}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
          {t.hero.title}
          <br />
          <span className="text-orange-400">{t.hero.titleHighlight}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-300 mb-10">
          {t.hero.description}
        </p>
        <button 
          onClick={() => router.push('/login')}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
        >
          {t.hero.cta}
        </button>
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div>
            <p className="text-4xl font-bold text-orange-400">{t.hero.stats.users}</p>
            <p className="text-gray-400">{t.hero.statsLabels.users}</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-orange-400">{t.hero.stats.tasks}</p>
            <p className="text-gray-400">{t.hero.statsLabels.tasks}</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-orange-400">{t.hero.stats.regions}</p>
            <p className="text-gray-400">{t.hero.statsLabels.regions}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// -----------------------------------------------------------------------------
// Section 3: Features
// -----------------------------------------------------------------------------
const Features = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800">{t.features.title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {t.features.items.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl p-8 flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="flex-shrink-0">
                <IconWrapper icon={feature.icon} className="bg-orange-100 !mb-0"/>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-5">{feature.description}</p>
                <a href="#" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                  {t.features.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// -----------------------------------------------------------------------------
// Section 4: How It Works
// -----------------------------------------------------------------------------
const HowItWorks = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">{t.howItWorks.title}</h2>
        <p className="text-lg text-gray-600 mb-16">{t.howItWorks.subtitle}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {t.howItWorks.steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center">
              <div className="relative mb-6">
                <IconWrapper icon={item.icon} className="bg-white border-2 border-gray-100" />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center">{item.step}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// -----------------------------------------------------------------------------
// Section 5: Pricing (MODIFIED)
// -----------------------------------------------------------------------------
const Pricing = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];
  const router = useRouter();

  return (
    <section id="pricing" className="bg-gray-900 text-white py-20">
      {/* Container is now wider */}
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            {/* Fonts are larger */}
            <h2 
              className="text-6xl font-bold mb-4"
              dangerouslySetInnerHTML={{
                __html: lang === 'en' 
                  ? '<span class="text-orange-400">Pricing Plans</span> That Scale With You' 
                  : '适合各种需求的<span class="text-orange-400">定价方案</span>'
              }}
            />
            <p className="text-xl text-gray-400">{t.pricing.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Free Plan - now wider/taller, not square */}
            <div className="bg-gray-800 p-8 rounded-xl flex flex-col h-[450px]">
              <h3 className="text-3xl font-bold mb-6">{t.pricing.free.title}</h3>
              <ul className="space-y-3 text-lg flex-grow">
                {t.pricing.free.features.map((feature, i) => (
                  <li key={i} className="flex items-center"><Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" /><span>{feature}</span></li>
                ))}
              </ul>
              <button 
                onClick={() => router.push('/login')}
                className="w-full bg-white text-gray-900 font-bold py-2.5 px-6 rounded-full text-lg hover:bg-gray-200 transition-colors mt-4"
              >
                {t.pricing.free.cta}
              </button>
            </div>
            {/* Paid Plan - now wider/taller, not square */}
            <div className="bg-gray-800 p-8 rounded-xl border-2 border-orange-500 flex flex-col h-[450px]">
              <h3 className="text-3xl font-bold">{t.pricing.paid.title}</h3>
              <p className="text-4xl font-bold my-4">{t.pricing.paid.price}</p>
              <p className="text-lg text-gray-400 flex-grow">{t.pricing.paid.description}</p>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-full text-lg transition-colors mt-4">
                {t.pricing.paid.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
  
// -----------------------------------------------------------------------------
// Section 6: Testimonials (MODIFIED)
// -----------------------------------------------------------------------------
const TestimonialCard = ({ testimonial, lang }: { testimonial: typeof content['en']['testimonials']['items'][0]; lang: 'en' | 'zh' }) => (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 w-[350px] md:w-[400px] flex-shrink-0 mx-4">
        {/* Font size increased for quote */}
        <p className="text-xl md:text-2xl text-gray-700 mb-6">&quot;{testimonial.quote}&quot;</p>
        <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full ${testimonial.bgColor} flex items-center justify-center text-white font-bold mr-3`}>{testimonial.avatar}</div>
            <div>
                {/* Font size increased for name */}
                <p className="font-semibold text-lg text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.handle}</p>
            </div>
        </div>
    </div>
);

const Testimonials = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];

  return (
    <>
      <style jsx global>{`
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        /* Default animation speed */
        .scrolling-wrapper { animation: scroll 60s linear infinite; }
        /* Reverse animation for second row */
        .scrolling-wrapper.reverse { animation-direction: reverse; }
      `}</style>
      <section className="py-20 bg-white overflow-hidden">
        <div className="container mx-auto px-6 text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800">{t.testimonials.title}</h2>
        </div>
        <div className="relative flex flex-col gap-8">
            {/* Row 1 - now contains all testimonials */}
            <div className="flex items-center">
                <div className="flex scrolling-wrapper">
                    {/* Duplicated array for seamless looping */}
                    {[...t.testimonials.items, ...t.testimonials.items].map((testimonial, i) => 
                      <TestimonialCard key={`row1-${i}`} testimonial={testimonial} lang={lang} />
                    )}
                </div>
            </div>
            {/* Row 2 - also contains all testimonials, scrolling in reverse */}
            <div className="flex items-center">
                <div className="flex scrolling-wrapper reverse">
                    {[...t.testimonials.items, ...t.testimonials.items].map((testimonial, i) => 
                      <TestimonialCard key={`row2-${i}`} testimonial={testimonial} lang={lang} />
                    )}
                </div>
            </div>
        </div>
      </section>
    </>
  );
};

// -----------------------------------------------------------------------------
// Section 7: FAQ (MODIFIED)
// -----------------------------------------------------------------------------
const FAQ = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];

  return (
    <section id="resources" className="py-20 bg-gray-50">
      {/* Container is now even wider (max-w-6xl), reducing side whitespace */}
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          {/* Fonts are larger */}
          <h2 className="text-5xl md:text-6xl font-bold text-gray-800">{t.faq.title}</h2>
          <p className="text-2xl text-gray-600 mt-4">{t.faq.subtitle}</p>
        </div>
        <div className="space-y-4">
          {t.faq.items.map((item, index) => (
            <details key={index} className="group bg-white p-8 rounded-lg border border-gray-200" name="faq">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <span className="font-semibold text-2xl text-gray-800">{item.question}</span>
                <span className="text-gray-500 transform transition-transform duration-300 group-open:rotate-180"><ChevronDown/></span>
              </summary>
              <p className="text-gray-700 text-xl mt-6">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
  
// -----------------------------------------------------------------------------
// Section 8: Final Call-to-Action
// -----------------------------------------------------------------------------
const FinalCTA = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];
  const router = useRouter();

  return (
    <section className="bg-orange-500 text-white">
      <div className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">{t.finalCta.title}</h2>
        <p className="text-lg opacity-90 mb-8">{t.finalCta.subtitle}</p>
        <button 
          onClick={() => router.push('/login')}
          className="bg-white text-orange-500 font-bold py-4 px-8 rounded-lg text-lg hover:bg-gray-100 transition-colors"
        >
          {t.finalCta.cta}
        </button>
        <div className="mt-8 flex justify-center items-center space-x-6 text-sm">
          {t.finalCta.benefits.map((benefit, i) => (
            <span key={i} className="flex items-center">
              <Check className="w-4 h-4 mr-1.5" /> {benefit}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

// -----------------------------------------------------------------------------
// Section 9: Footer
// -----------------------------------------------------------------------------
const Footer = ({ lang }: { lang: 'en' | 'zh' }) => {
  const t = content[lang];
  const router = useRouter();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 mb-6 md:mb-0">
                <div className="flex items-center space-x-2 mb-4">
                  <BookMarked className="w-7 h-7 text-orange-400" />
                  <span className="text-xl font-bold text-white">BulletAI</span>
                </div>
                <p className="text-gray-400 pr-8">{t.footer.company}</p>
            </div>
            <div>
                <h4 className="font-semibold text-white mb-4">{t.footer.product.title}</h4>
                <ul className="space-y-3">
                    {t.footer.product.items.map((item, i) => (
                      <li key={i}>
                        <a href="#" className="hover:text-orange-400">{item}</a>
                      </li>
                    ))}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-white mb-4">{t.footer.companySection.title}</h4>
                <ul className="space-y-3">
                    {t.footer.companySection.items.map((item, i) => (
                      <li key={i}>
                        <a href="#" className="hover:text-orange-400">{item}</a>
                      </li>
                    ))}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-white mb-4">{t.footer.support.title}</h4>
                <ul className="space-y-3">
                    {t.footer.support.items.map((item, i) => (
                      <li key={i}>
                        <a href="#" className="hover:text-orange-400">{item}</a>
                      </li>
                    ))}
                </ul>
            </div>
        </div>
        <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>{t.footer.copyright}</p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
                {t.footer.legal.map((item, i) => (
                  <a key={i} href="#" className="hover:text-white">{item}</a>
                ))}
            </div>
        </div>
      </div>
    </footer>
  );
};
  
// -----------------------------------------------------------------------------
// Main Page Component
// -----------------------------------------------------------------------------
export default function LandingPage() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const router = useRouter();
  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  
  return (
    <div className="bg-white font-sans">
      <Header lang={lang} setLang={setLang} />
      <main>
        <Hero lang={lang} />
        <Features lang={lang} />
        <HowItWorks lang={lang} />
        <Pricing lang={lang} />
        <Testimonials lang={lang} />
        <FAQ lang={lang} />
        <FinalCTA lang={lang} />
      </main>
      <Footer lang={lang} />
      <button 
        onClick={scrollToTop} 
        className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-110"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>
    </div>
  );
}