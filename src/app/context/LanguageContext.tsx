// app/context/LanguageContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// 简化翻译对象的类型定义
type TranslationValue = 
  | { en: string; zh: string }
  | { en: string; zh: string }[];

const translations: Record<string, TranslationValue> = {
  // LoginPage translations
  loginTitle: {
    en: "Login to BulletAI",
    zh: "登录 BulletAI",
  },
  emailLabel: {
    en: "Email",
    zh: "邮箱",
  },
  passwordLabel: {
    en: "Password",
    zh: "密码",
  },
  emailPlaceholder: {
    en: "you@example.com",
    zh: "you@example.com",
  },
  passwordPlaceholder: {
    en: "Enter your password",
    zh: "请输入密码",
  },
  login: {
    en: "Login",
    zh: "登录",
  },
  loggingIn: {
    en: "Logging in…",
    zh: "登录中…",
  },
  or: {
    en: "or",
    zh: "或",
  },
  githubLogin: {
    en: "Login with GitHub",
    zh: "使用 GitHub 登录",
  },
  googleLogin: {
    en: "Login with Google",
    zh: "使用 Google 登录",
  },
  registerTip: {
    en: "No account? Register here",
    zh: "没有账号？去注册",
  },
  // RegisterPage translations
  registerTitle: {
    en: "Register for BulletAI",
    zh: "注册 BulletAI",
  },
  setEmail: {
    en: "Email",
    zh: "邮箱",
  },
  setPassword: {
    en: "Set Password",
    zh: "设置密码",
  },
  confirmPassword: {
    en: "Confirm Password",
    zh: "确认密码",
  },
  confirmEmailPlaceholder: {
    en: "you@example.com",
    zh: "you@example.com",
  },
  setPasswordPlaceholder: {
    en: "Enter password",
    zh: "请输入密码",
  },
  confirmPasswordPlaceholder: {
    en: "Enter password again",
    zh: "请再次输入密码",
  },
  register: {
    en: "Register",
    zh: "注册",
  },
  registering: {
    en: "Registering…",
    zh: "注册中…",
  },
  alreadyAccount: {
    en: "Already have an account? Login",
    zh: "已有账号？去登录",
  },
  passwordMismatch: {
    en: "Passwords do not match",
    zh: "两次输入的密码不一致",
  },
  passwordMatch: {
    en: "Passwords match",
    zh: "密码匹配",
  },
  // LandingPage translations
  slogan: {
    en: "Every soul deserves to be recorded",
    zh: "每一个灵魂，都值得被记录",
  },
  getStarted: {
    en: "Start Recording",
    zh: "开始记录",
  },
  learnMore: {
    en: "Learn More",
    zh: "了解更多",
  },
  coreFeatures: {
    en: "Four Core Features",
    zh: "四大核心功能",
  },
  featuresDescription: {
    en: "Comprehensive recording, planning, thinking, letting AI be your growth partner",
    zh: "全方位记录、规划、思考，让 AI 成为你的成长伙伴",
  },
  moments: {
    en: "My Moments",
    zh: "我的时刻",
  },
  momentsDescription: {
    en: "Record daily bits, cherish life moments in a dedicated diary",
    zh: "记录日常点滴，珍藏生活瞬间的专属日记",
  },
  momentsItems: [
    {
      en: "Multimedia Recording: Support text, images, videos to make memories more vivid",
      zh: "多媒体记录: 支持文字、图片、视频，让回忆更生动",
    },
    {
      en: "Smart Tagging: Customize event types (e.g., life, work, travel) and geographic location",
      zh: "智能标记: 自定义事件类型（如生活、工作、旅行）与地理位置",
    },
    {
      en: "Habit Check-in Association: Automatically check in 'My Habits' when posting moments",
      zh: "习惯打卡关联: 发布时刻时可关联“我的习惯”自动打卡",
    },
    {
      en: "Free Editing: Delete or modify published moments anytime",
      zh: "自由编辑: 随时删除或修改已发布的时刻",
    },
    {
      en: "Efficient Retrieval: Quickly filter and review through keywords or event types",
      zh: "高效检索: 通过关键词或事件类型快速筛选回顾",
    },
  ],
  goals: {
    en: "My Goals",
    zh: "我的目标",
  },
  goalsDescription: {
    en: "Clear planning for tasks and dreams, from daily to-dos to long-term goals",
    zh: "清晰规划任务与梦想，从每日待办到长期目标",
  },
  goalsItems: [
    {
      en: "Today's To-Dos: Add tasks, set priorities, mark completion status",
      zh: "今日待办: 添加任务、设置优先级、标记完成状态",
    },
    {
      en: "Recent Goals: Set medium or long-term goals and track progress",
      zh: "近期目标: 设定中期或长期目标并追踪进度",
    },
    {
      en: "My Habits: Create habits, set frequency, track check-in counts",
      zh: "我的习惯: 创建习惯、设定频率、统计打卡次数",
    },
    {
      en: "Flexible Management: Edit or delete tasks, goals, and habits anytime",
      zh: "灵活管理: 随时编辑或删除任务、目标与习惯",
    },
  ],
  insights: {
    en: "My Insights",
    zh: "我的感悟",
  },
  insightsDescription: {
    en: "Accumulate inspiration and thoughts, build your private thought library",
    zh: "沉淀灵感与思考，打造你的私人思想库",
  },
  insightsItems: [
    {
      en: "Deep Recording: Support text, images, videos to record insights",
      zh: "深度记录: 支持文字、图片、视频记录感悟",
    },
    {
      en: "Background Information: Mark event types, inspiration sources, and location",
      zh: "背景信息: 标注事件类型、灵感来源与地点",
    },
    {
      en: "Free Editing: All insights can be modified or deleted anytime",
      zh: "自由编辑: 所有感悟均可随时修改或删除",
    },
    {
      en: "Quick Search: Search past inspirations via keywords",
      zh: "快速查找: 通过关键词搜索过往灵感",
    },
  ],
  aiCave: {
    en: "AI Cave",
    zh: "AI树洞",
  },
  aiCaveDescription: {
    en: "Your private smart partner, understands you, accompanies you, inspires you",
    zh: "你的私密智能伙伴，懂你、陪你、启发你",
  },
  aiCaveItems: [
    {
      en: "Personalized Conversation: Deep understanding and response based on all your records",
      zh: "个性化对话: 基于你所有记录进行深度理解与回应",
    },
    {
      en: "Emotional Support: Listen and accompany with warmth and empathy",
      zh: "情感支持: 以温暖、共情的方式倾听与陪伴",
    },
    {
      en: "Smart Insights: Review the past, provide growth perspectives and new thoughts",
      zh: "智能洞察: 回顾过往，提供成长视角与新思考",
    },
    {
      en: "Absolutely Private: All data is used only by you and AI, safe and worry-free",
      zh: "绝对私密: 所有数据仅限你与AI使用，安全无忧",
    },
  ],
  suitableForEveryone: {
    en: "A starting point for everyone",
    zh: "适合每个人的起点",
  },
  pricingDescription: {
    en: "Experience all core features of BulletAI, start your growth journey",
    zh: "体验 BulletAI 全部核心功能，开启你的成长之旅",
  },
  freeStart: {
    en: "Start Free",
    zh: "免费开始",
  },
  pricingFeatures: [
    {
      en: "My Moments: Complete recording and management",
      zh: "我的时刻：完整记录与管理",
    },
    {
      en: "My Goals: Task, goal, and habit tracking",
      zh: "我的目标：任务、目标与习惯追踪",
    },
    {
      en: "My Insights: Inspiration accumulation and review",
      zh: "我的感悟：灵感沉淀与回顾",
    },
    {
      en: "AI Cave: Private smart conversation and insights",
      zh: "AI树洞：私密智能对话与洞察",
    },
    {
      en: "Multimedia Support: Text, images, videos",
      zh: "多媒体支持：文字、图片、视频",
    },
    {
      en: "Tag Classification and Keyword Search",
      zh: "标签分类与关键词搜索",
    },
  ],
  startYourStory: {
    en: "Start Recording Your Story",
    zh: "开始记录您的故事",
  },
  storyDescription: {
    en: "Let every thought, every growth, every moment of emotion be treasured",
    zh: "让每一个想法、每一次成长、每一刻感动都被珍藏",
  },
  startNow: {
    en: "Start Now",
    zh: "立即开始",
  },
  copyright: {
    en: "© 2025 BulletAI. Every soul deserves to be recorded",
    zh: "© 2025 BulletAI. 每一个灵魂，都值得被记录",
  },
  contactUs: {
    en: "Contact Us",
    zh: "联系我们",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // 检查URL参数或localStorage中的语言设置
    const urlLang = searchParams.get('lang');
    if (urlLang === 'zh' || urlLang === 'en') {
      setLanguageState(urlLang as Language);
    } else {
      // 尝试从localStorage获取
      const storedLang = localStorage.getItem('language') as Language | null;
      if (storedLang) {
        setLanguageState(storedLang);
      }
    }
  }, [searchParams]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    
    // 更新URL参数
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.set('lang', lang);
    
    // 更新路由，但不重新加载页面
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false });
  };

  const t = (key: string): string => {
    // 检查是否是数组访问格式，例如 "momentsItems[0]"
    const arrayMatch = key.match(/^([a-zA-Z0-9_]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      const array = translations[arrayName];
      
      if (Array.isArray(array) && index >= 0 && index < array.length) {
        const item = array[index] as { en: string; zh: string };
        return language === 'zh' ? item.zh : item.en;
      }
    }
    
    // 普通翻译
    const translation = translations[key];
    if (!translation) {
      return key; // 如果没有找到翻译，返回原key
    }
    
    if (Array.isArray(translation)) {
      // 这是数组，不应该直接访问，应该通过上面的格式访问
      return key;
    }
    
    // 这是对象翻译
    const translationObj = translation as { en: string; zh: string };
    return language === 'zh' ? translationObj.zh : translationObj.en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}