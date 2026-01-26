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
    en: "With BulletAI, become who you dream to be",
    zh: "在BulletAI，成为自己梦想中的样子",
  },
  heroTitle: {
    en: "Regain order and meaning in life",
    zh: "找回人生的秩序感和意义感"
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
    en: "Every soul deserves to be recorded",
    zh: "每一个灵魂，都值得被记录",
  },
  featuresDescription: {
    en: "Comprehensive recording, planning, thinking, letting AI be your growth partner",
    zh: "全方位记录、规划、思考，让 AI 成为你的成长伙伴",
  },
  moments: {
    en: "My Moments",
    zh: "记录",
  },
  momentsDescription: {
    en: "In the quiet fragments of time, where silence speaks truth, we gently recognize ourselves",
    zh: "在那些细碎、沉默却真实存在的瞬间里，我们悄然认出了自己",
  },
  momentsItems: [
    {
      en: "Rich Content: Record with text, images, event types, locations, and custom tags",
      zh: "丰富内容: 支持文字、图片、事件类型、地点和自定义标签记录",
    },
    {
      en: "AI Moment Assistant: Chat about life topics, get companionship and inspiration",
      zh: "AI时刻助手: 聊生活话题，获得陪伴与启发",
    },
    {
      en: "Unified Search: Search across all content types with one keyword",
      zh: "统一搜索: 一个关键词搜索所有类型的内容",
    },
  ],
  goals: {
    en: "My Goals",
    zh: "目标",
  },
  goalsDescription: {
    en: "In steps taken without applause, we quietly become who we are meant to be",
    zh: "在那些无人喝彩却未曾停下的脚步里，我们默默靠近了自己想成为的人",
  },
  goalsItems: [
    {
      en: "Calendar Planning: Visualize goals on calendar, manage by date",
      zh: "日程规划: 在日历上可视化目标，按日期管理",
    },
    {
      en: "Migration List: Flexible goal management, assign to specific dates",
      zh: "待分配任务: 灵活的目标管理，分配到具体日期",
    },
    {
      en: "Habit Tracking: Create habits, set frequency, track check-ins",
      zh: "习惯追踪: 创建习惯、设定频率、记录打卡",
    },
    {
      en: "AI Planning Assistant: Break down large goals into actionable sub-goals",
      zh: "AI智能规划: 将大目标拆分成可执行的小目标",
    },
  ],
  insights: {
    en: "My Insights",
    zh: "感悟",
  },
  insightsDescription: {
    en: "In countless solitary moments with dawn or dusk, we finally hear the faintest yet truest echo within",
    zh: "在无数个独自面对晨光或夜色的刹那，我们终于听见了内心最轻却最真的回响",
  },
  insightsItems: [
    {
      en: "Rich Recording: Record insights with text, images, sources, and locations",
      zh: "丰富记录: 支持文字、图片、来源、地点记录感悟",
    },
    {
      en: "AI Thought Assistant: Explore philosophy, life wisdom, and profound insights",
      zh: "AI思维助手: 探讨哲学思想、人生智慧与深刻洞察",
    },
    {
      en: "Unified Search: Search across all content with one keyword",
      zh: "统一搜索: 一个关键词搜索所有内容",
    },
  ],
  aiEmpowerment: {
    en: "AI Empowerment",
    zh: "AI赋能",
  },
  aiEmpowermentDescription: {
    en: "In the profound silence of algorithms, we hear the rhythm of our own heartbeat more clearly",
    zh: "让我们在算法的静默深处，更清晰地听见自己心跳的节奏。",
  },
  aiEmpowermentItems: [
    {
      en: "AI Moment Assistant: Chat about life, share beautiful moments together",
      zh: "AI时刻助手: 聊生活话题，一起分享美好瞬间",
    },
    {
      en: "AI Thought Assistant: Explore philosophy and life wisdom in depth",
      zh: "AI思维助手: 深入探讨哲学思想与人生智慧",
    },
    {
      en: "AI Planning Assistant: Break down large goals into actionable steps",
      zh: "AI智能规划: 将大目标拆解成可执行的步骤",
    },
    {
      en: "Intelligent Integration: AI understands your records and provides personalized support",
      zh: "智能融合: AI理解你的记录，提供个性化支持",
    },
  ],
  suitableForEveryone: {
    en: "A journey of a thousand miles\nbegins with a single step",
    zh: "千里之行，\n始于足下",
  },
  pricingDescription: {
    en: "Experience all core features of BulletAI, start your growth journey",
    zh: "体验 BulletAI 全部核心功能，\n开启你的成长之旅",
  },
  freeStart: {
    en: "Start Free",
    zh: "免费开始",
  },
  pricingFeatures: [
    {
      en: "Record life moments with text and images",
      zh: "记录生活瞬间：支持文字和图片",
    },
    {
      en: "Plan goals and track habits on calendar",
      zh: "规划目标与习惯：日历可视化管理",
    },
    {
      en: "Capture insights and reflections",
      zh: "记录感悟与思考",
    },
    {
      en: "Three AI assistants: Moment, Planning, and Thought",
      zh: "三大AI助手：时刻、规划、思维",
    },
    {
      en: "All features free forever",
      zh: "全部功能永久免费",
    },
  ],
  startYourStory: {
    en: "Start Recording, Planning and Thinking",
    zh: "开始记录、规划与思考",
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
  back: {
    en: "Back",
    zh: "返回",
  },
  contactDescription: {
    en: "If you have any questions or suggestions, please feel free to contact us",
    zh: "如有任何问题或建议，欢迎联系我们",
  },
  from: {
    en: "From",
    zh: "来自",
  },
  universityHIT: {
    en: "Harbin Institute of Technology",
    zh: "哈尔滨工业大学",
  },
  universityUSTC: {
    en: "University of Science and Technology of China",
    zh: "中国科学技术大学",
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
    en: "+ New Moment",
    zh: "+ 记录新时刻",
  },
  addNewReflection: {
    en: "+ New Reflection",
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
    en: "Enter search content~",
    zh: "输入搜索内容~",
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
    zh: "目标",
  },
  planForFuture: {
    en: "Plan for the future, become a better self",
    zh: "规划未来，成就更好的自己",
  },
  aiPlanning: {
    en: "AI Planning",
    zh: "AI智能规划",
  },
  aiPlanningGreeting: {
    en: "Hello! I'm your AI Planning Assistant. Tell me what goal you want to achieve, and I'll help you break it down into actionable sub-goals. 🎯",
    zh: "你好！我是你的AI规划助手。请告诉我你想完成什么目标，我会帮你拆解成可执行的小目标。🎯",
  },
  aiGoalInputPlaceholder: {
    en: "Enter the large goal you want to achieve...",
    zh: "输入你想完成的大目标...",
  },
  addToMigrationList: {
    en: "Add to Migration List",
    zh: "一键添加到待分配任务",
  },
  goalsAddedSuccessfully: {
    en: "✅ Goals have been successfully added to the migration list!",
    zh: "✅ 目标已成功添加到待分配任务！",
  },
  addGoalsFailed: {
    en: "Failed to add goals, please try again later.",
    zh: "添加目标失败，请稍后再试。",
  },
  adding: {
    en: "Adding...",
    zh: "添加中...",
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
  schedulePlanning: {
    en: "Schedule Planning",
    zh: "日程规划",
  },
  selectDate: {
    en: "Please select a date",
    zh: "请选择日期",
  },
  noGoalsForDate: {
    en: "No goals for this date",
    zh: "该日期暂无目标",
  },
  migrationList: {
    en: "Migration List",
    zh: "待分配任务",
  },
  noMigrationGoals: {
    en: "Migration list is empty. New goals will be added here automatically.",
    zh: "待分配任务为空，新建目标将自动添加到这里",
  },
  selectDateToMigrate: {
    en: "Please select a date on the calendar, then click the migrate button",
    zh: "请先选择日历中的日期，然后点击迁移按钮",
  },
  migrate: {
    en: "Migrate",
    zh: "迁移",
  },
  moveBack: {
    en: "Move Back",
    zh: "迁回",
  },
  migrateFailed: {
    en: "Migration failed",
    zh: "迁移失败",
  },
  moveBackFailed: {
    en: "Move back failed",
    zh: "迁回失败",
  },
  switchPanel: {
    en: "Switch Panel",
    zh: "切换面板",
  },
  dueDate: {
    en: "Date",
    zh: "日期",
  },
  myHabits: {
    en: "My Habits",
    zh: "我的习惯（坚持100天，量变到质变）",
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
    en: "Persisted for ",
    zh: "已坚持 ",
  },
  times: {
    en: " days",
    zh: " 天",
  },
  lastCheckin: {
    en: "Last check-in: ",
    zh: "上次打卡：",
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
  enterTitle: {
    en: "Enter title (required)",
    zh: "输入标题（必填）",
  },
  detailedDescription: {
    en: "Detailed description...",
    zh: "详细描述...",
  },
  pleaseEnterTitle: {
    en: "Please enter the title",
    zh: "请填写标题",
  },
  saveFailed: {
    en: "Save failed, please try again",
    zh: "保存失败，请重试",
  },
  completed: {
    en: "Completed",
    zh: "已完成",
  },
  completeGoal: {
    en: "Complete Goal",
    zh: "完成目标",
  },
  update: {
    en: "Update",
    zh: "更新",
  },
  updating: {
    en: "Updating...",
    zh: "更新中...",
  },
  delete: {
    en: "Delete",
    zh: "删除",
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
  editReflection: {
    en: "Edit Reflection",
    zh: "编辑感悟",
  },
  edit: {
    en: "Edit",
    zh: "编辑",
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
    zh: "记录",
  },
  myGoalsNav: {
    en: "My Goals",
    zh: "目标",
  },
  myReflectionsNav: {
    en: "My Reflections",
    zh: "感悟",
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
  // AI Assistant translations
  aiAssistant: {
    en: "AI Assistant",
    zh: "AI助手",
  },
  aiThoughtAssistant: {
    en: "AI Thought Assistant",
    zh: "AI思维助手",
  },
  aiMomentAssistant: {
    en: "AI Moment Assistant",
    zh: "AI时刻助手",
  },
  aiThoughtAssistantGreeting: {
    en: "Hello! I'm your AI Thought Assistant, focused on exploring philosophical ideas, life wisdom, and profound insights with you. Let's think about the meaning of life together! ✨",
    zh: "你好！我是你的AI思维助手，专注于和你探讨哲学思想、人生智慧等深刻的感悟话题。让我们一起思考生活的意义吧！✨",
  },
  aiMomentAssistantGreeting: {
    en: "Hello! I'm your AI Moment Assistant, focused on chatting about life-related topics with you. Let's share the beautiful moments in life together! 🌟",
    zh: "你好！我是你的AI时刻助手，专注于和你聊生活相关的话题。让我们一起分享生活中的美好瞬间吧！🌟",
  },
  recentRecords: {
    en: "Recent Records",
    zh: "近一周记录",
  },
  viewAll: {
    en: "View All",
    zh: "查看全部",
  },
  manage: {
    en: "Manage",
    zh: "管理",
  },
  noRecentRecords: {
    en: "No recent records",
    zh: "暂无近一周的记录",
  },
  noTasksToday: {
    en: "No tasks today",
    zh: "今日暂无任务",
  },
  inProgress: {
    en: "In Progress",
    zh: "进行中",
  },
  // BottomSidebar translations
  settings: {
    en: "Settings",
    zh: "设置",
  },
  logout: {
    en: "Logout",
    zh: "退出登录",
  },
  confirmLogout: {
    en: "Confirm Logout",
    zh: "确认退出登录",
  },
  confirmLogoutMessage: {
    en: "Are you sure you want to logout?",
    zh: "确定要退出登录吗？",
  },
  // Settings panel translations
  close: {
    en: "Close",
    zh: "关闭",
  },
  user: {
    en: "User",
    zh: "用户",
  },
  userSettings: {
    en: "User Settings",
    zh: "用户设置",
  },
  username: {
    en: "Username",
    zh: "用户名",
  },
  usernamePlaceholder: {
    en: "Enter username",
    zh: "请输入用户名",
  },
  usernameRequired: {
    en: "Please enter a username",
    zh: "请输入用户名",
  },
  usernameUnchanged: {
    en: "Username unchanged",
    zh: "用户名未更改",
  },
  usernameTaken: {
    en: "This username is already taken, please choose another",
    zh: "该用户名已被使用，请选择其他用户名",
  },
  usernameChangeCooldown: {
    en: "You need to wait {days} days before changing your username again",
    zh: "您需要等待 {days} 天才能再次修改用户名",
  },
  updateSuccess: {
    en: "Username updated successfully!",
    zh: "用户名更新成功！",
  },
  updateFailed: {
    en: "Update failed, please try again later",
    zh: "更新失败，请稍后再试",
  },
  updateError: {
    en: "An error occurred, please try again later",
    zh: "发生错误，请稍后再试",
  },
  save: {
    en: "Save",
    zh: "保存",
  },
  saving: {
    en: "Saving...",
    zh: "保存中...",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 使用统一的默认值 'zh'，避免 SSR/CSR 不匹配
  // 服务器端和客户端都使用相同的初始值
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    // 客户端 hydration 后，检查并同步语言设置
    const urlLang = searchParams.get('lang');
    if (urlLang === 'zh' || urlLang === 'en') {
      setLanguageState(urlLang as Language);
    } else {
      // 尝试从localStorage获取
      const storedLang = localStorage.getItem('language') as Language | null;
      if (storedLang === 'zh' || storedLang === 'en') {
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