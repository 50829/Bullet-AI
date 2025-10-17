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
  heroTitle: {
    en: "Show me your verve and vitality.",
    zh: "展现你的活力与热情。" // 你可以根据需要调整中文翻译
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
      en: "Multimedia Recording: Support text, images to make memories more vivid",
      zh: "多媒体记录: 支持文字、图片，让回忆更生动",
    },
    {
      en: "Smart Tagging: Customize event types (e.g., life, work, travel) and geographic location",
      zh: "智能标记: 自定义事件类型（如生活、工作、旅行）与地理位置",
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
      en: "Deep Recording: Support text, images to record insights",
      zh: "深度记录: 支持文字、图片记录感悟",
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
      en: "Multimedia Support: Text, images",
      zh: "多媒体支持：文字、图片",
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
  // MomentsPage translations
  loading: {
    en: "Loading...",
    zh: "加载中...",
  },
  loadingMoments: {
    en: "Loading moments...",
    zh: "记忆生成中...",
  },
  loadingReflections: {
    en: "Loading reflections...",
    zh: "思考即将开始...",
  },
  addNewMoment: {
    en: "+ Add New Moment",
    zh: "+ 记录新时刻",
  },
  addNewReflection: {
    en: "+ Add New Reflection",
    zh: "+ 记录新感悟",
  },
  collapseSearch: {
    en: "Collapse Search",
    zh: "折叠搜索栏",
  },
  search: {
    en: "Search",
    zh: "搜索",
  },
  text: {
    en: "Text",
    zh: "文本",
  },
  event: {
    en: "Event",
    zh: "事件",
  },
  location: {
    en: "Location",
    zh: "地点",
  },
  inspiration: {
    en: "Inspiration",
    zh: "灵感来源",
  },
  searchPlaceholder: {
    en: "Select search type, then enter search content~",
    zh: "选择搜索类型，再输入搜索内容~",
  },
  clear: {
    en: "Clear",
    zh: "清空",
  },
  noMatches: {
    en: "No matching records found",
    zh: "没有找到匹配的记录",
  },
  noRecords: {
    en: "No records yet, click the button above to create your first record!",
    zh: "暂无记录，点击上方按钮记录第一个记录吧！",
  },
  confirmDelete: {
    en: "Confirm deletion?",
    zh: "确认删除吗？",
  },
  cannotRecover: {
    en: "Cannot recover after deletion.",
    zh: "删除后无法恢复。",
  },
  cancel: {
    en: "Cancel",
    zh: "取消",
  },
  confirm: {
    en: "Confirm",
    zh: "确认",
  },
  // Additional loading translations
  loadingMomentsDetailed: {
    en: "Moments are loading...",
    zh: "记忆生成中...",
  },
  loadingReflectionsDetailed: {
    en: "Reflections are loading...",
    zh: "思考即将开始...",
  },
  // GoalsPage translations
  myGoals: {
    en: "My Goals",
    zh: "我的目标",
  },
  planForFuture: {
    en: "Plan for the future, become a better self",
    zh: "规划未来，成就更好的自己",
  },
  aiPlanning: {
    en: "AI Planning",
    zh: "AI智能规划",
  },
  new: {
    en: "New",
    zh: "新建",
  },
  goal: {
    en: "Goal",
    zh: "目标",
  },
  habit: {
    en: "Habit",
    zh: "习惯",
  },
  todayTasks: {
    en: "Today's Tasks",
    zh: "今日待办",
  },
  recentGoals: {
    en: "Recent Goals",
    zh: "近期目标",
  },
  myHabits: {
    en: "My Habits",
    zh: "我的习惯",
  },
  aiPlanningGreeting: {
    en: "Hello! I'm your AI planning assistant. Please tell me what goal you want to achieve, and I'll help you break it down into actionable tasks. 🎯",
    zh: "你好！我是你的AI规划助手。请告诉我你想完成什么目标，我会帮你拆解成可执行的任务列表。🎯",
  },
  deleteHabitNotImplemented: {
    en: "Deleting habits is not yet implemented",
    zh: "删除习惯功能尚未实现",
  },
  deleteFailed: {
    en: "Deletion failed, please try again later",
    zh: "删除失败，请稍后重试",
  },
  moveFailed: {
    en: "Move failed, operation rolled back, please check console logs or try again later",
    zh: "移动失败，操作已回滚，请检查控制台日志或稍后重试",
  },
  checkinFailed: {
    en: "Check-in failed",
    zh: "打卡失败",
  },
  aiError: {
    en: "Sorry, something went wrong, please try again later.",
    zh: "抱歉，出了点问题，请稍后再试。",
  },
  pleaseLogin: {
    en: "Please log in first",
    zh: "请先登录",
  },
  addFailed: {
    en: "Failed to add",
    zh: "添加失败",
  },
  retry: {
    en: "please try again",
    zh: "请重试",
  },
  addSuccess: {
    en: "Successfully added",
    zh: "成功添加",
  },
  tasksAdded: {
    en: "tasks/Goals!",
    zh: "个任务/目标！",
  },
  loadingGoals: {
    en: "Loading goals...",
    zh: "目标加载中...",
  },
  checkedIn: {
    en: "Done!",
    zh: "已打卡",
  },
  checkin: {
    en: "Check in",
    zh: "打卡",
  },
  checkinCount: {
    en: "Checked in ",
    zh: "已打卡 ",
  },
  times: {
    en: " times",
    zh: " 次",
  },
  lastCheckin: {
    en: "Last check-in ",
    zh: "上次打卡 ",
  },
  daysAgo: {
    en: " days ago",
    zh: " 天前",
  },
  questionMark: {
    en: "?",
    zh: "吗？",
  },
  aiGeneratedPlan: {
    en: "📋 AI Generated Plan:",
    zh: "📋 AI生成的计划：",
  },
  addTasksToGoals: {
    en: "Add to Goals",
    zh: "一键添加到目标",
  },
  aiThinking: {
    en: "AI is thinking...",
    zh: "AI正在思考中...",
  },
  aiInputPlaceholder: {
    en: "Enter what you want to accomplish...",
    zh: "输入你想完成的事情...",
  },
  // GoalModal translations
  newGoal: {
    en: "New Goal",
    zh: "新建目标",
  },
  title: {
    en: "Title",
    zh: "标题",
  },
  description: {
    en: "Description",
    zh: "描述",
  },
  type: {
    en: "Type",
    zh: "类型",
  },
  priority: {
    en: "Priority",
    zh: "优先级",
  },
  high: {
    en: "High",
    zh: "高",
  },
  medium: {
    en: "Medium",
    zh: "中",
  },
  low: {
    en: "Low",
    zh: "低",
  },
  enterGoal: {
    en: "Enter goal...",
    zh: "输入目标...",
  },
  detailedDescription: {
    en: "Detailed description...",
    zh: "详细描述...",
  },
  pleaseEnterTitle: {
    en: "Please enter the goal title",
    zh: "请填写目标标题",
  },
  saveFailed: {
    en: "Save failed, please try again",
    zh: "保存失败，请重试",
  },
  saving: {
    en: "Saving...",
    zh: "记录中...",
  },
  save: {
    en: "Save",
    zh: "记录",
  },
  // HabitModal translations
  newHabit: {
    en: "New Habit",
    zh: "新建习惯",
  },
  habitName: {
    en: "Habit Name",
    zh: "习惯名称",
  },
  habitPlaceholder: {
    en: "e.g., Morning Reading, Exercise Check-in...",
    zh: "例如：晨间阅读、运动打卡...",
  },
  describeHabit: {
    en: "Describe this habit...",
    zh: "描述这个习惯...",
  },
  targetFrequency: {
    en: "Target Frequency",
    zh: "目标频率",
  },
  color: {
    en: "Color",
    zh: "标识颜色",
  },
  preview: {
    en: "Preview",
    zh: "预览",
  },
  daily: {
    en: "Daily",
    zh: "每日",
  },
  weekly: {
    en: "Weekly",
    zh: "每周",
  },
  monthly: {
    en: "Monthly",
    zh: "每月",
  },
  blue: {
    en: "Blue",
    zh: "蓝色",
  },
  red: {
    en: "Red",
    zh: "红色",
  },
  green: {
    en: "Green",
    zh: "绿色",
  },
  yellow: {
    en: "Yellow",
    zh: "黄色",
  },
  purple: {
    en: "Purple",
    zh: "紫色",
  },
  pleaseEnterHabitName: {
    en: "Please enter the habit name",
    zh: "请填写习惯名称",
  },
  // MomentModal translations
  newMoment: {
    en: "New Moment",
    zh: "记录新时刻",
  },
  content: {
    en: "Content",
    zh: "内容",
  },
  recordFeelings: {
    en: "Record this moment's feelings...",
    zh: "记录这一刻的感受...",
  },
  eventType: {
    en: "Event Type",
    zh: "事件类型",
  },
  eventTypePlaceholder: {
    en: "e.g., Life, Work...",
    zh: "例如：生活、工作...",
  },
  location1: {
    en: "Location",
    zh: "地点",
  },
  locationPlaceholder: {
    en: "Record location...",
    zh: "记录地点...",
  },
  uploadImage: {
    en: "Upload an Image",
    zh: "上传一张图片",
  },
  contentCannotBeEmpty: {
    en: "Content cannot be empty",
    zh: "内容不能为空",
  },
  imageUploadFailed: {
    en: "Image upload failed, please try again",
    zh: "图片上传失败，请重试",
  },
  publishFailed: {
    en: "Publish failed, please try again",
    zh: "发布失败，请重试",
  },
  // ReflectionModal translations
  newReflection: {
    en: "New Reflection",
    zh: "记录新感悟",
  },
  inspirationSource: {
    en: "Inspiration Source",
    zh: "灵感来源",
  },
  inspirationSourcePlaceholder: {
    en: "What triggered this thought?",
    zh: "是什么触发了这个想法？",
  },
  uploadMedia: {
    en: "Upload an Image",
    zh: "上传一张图片",
  },
  eventPlaceholder: {
    en: "e.g., Reading, Movie, Thinking...",
    zh: "例如：读书、电影、思考...",
  },
  locationPlaceholder1: {
    en: "Where did you get the inspiration?",
    zh: "在哪里获得的灵感？",
  },
  pleaseEnterContent: {
    en: "Please enter the reflection content",
    zh: "请填写感悟内容",
  },
  recordThoughts: {
    en: "Record your thoughts and reflections...",
    zh: "记录你的思考和感悟...",
  },
  // MonthlyRecommendationPage translations
  monthlyRecommendation: {
    en: "Monthly Recommendation",
    zh: "月度推荐",
  },
  monthlyHighlights: {
    en: "Oct 2025",
    zh: "2025 10月",
  },
  pastReviews: {
    en: "Past Reviews",
    zh: "往期回顾",
  },
  musicRecommendation: {
    en: "Music",
    zh: "音乐推荐",
  },
  dailyQuote: {
    en: "Quote",
    zh: "美句推荐",
  },
  bookRecommendation: {
    en: "Book",
    zh: "书籍推荐",
  },
  play: {
    en: "Play",
    zh: "播放",
  },
  // Sidebar translations
  monthlyRecommendationNav: {
    en: "Monthly Recommendation",
    zh: "月度推荐",
  },
  myMomentsNav: {
    en: "My Moments",
    zh: "我的时刻",
  },
  myGoalsNav: {
    en: "My Goals",
    zh: "我的目标",
  },
  myReflectionsNav: {
    en: "My Reflections",
    zh: "我的感悟",
  },
  aiCaveNav: {
    en: "AI Cave",
    zh: "AI树洞",
  },
  toggleMenu: {
    en: "Toggle Menu",
    zh: "切换菜单",
  },
  // AICompanionPage translations
  aiCaveTitle: {
    en: "AI Cave",
    zh: "AI树洞",
  },
  aiCaveDescription1: {
    en: "Based on your records, have deep conversations with you",
    zh: "基于你的记录，与你深入对话",
  },
  aiCaveGreeting: {
    en: "Hello! I'm your AI Cave, based on all your recorded moments, insights, and goals, I'll chat with you deeply and listen to your heart. What would you like to share with me? 🔮",
    zh: "你好！我是你的AI树洞，基于你记录的所有时刻、感悟和目标，我会陪你深入聊天，倾听你的心声。有什么想和我分享的吗？🔮",
  },
  aiCaveThinking: {
    en: "Thinking...",
    zh: "思考中...",
  },
  aiCaveInputPlaceholder: {
    en: "Enter your thoughts...",
    zh: "输入你的想法...",
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