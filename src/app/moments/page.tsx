// app/moments/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Search, Trash2, X, Sparkles, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { MomentModal } from "../components/MomentModal";
import { AIChatPanel } from "../components/AIChatPanel";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook

type Moment = {
  id: number;
  created_at: string;
  content: string;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

// 按日期分组的卡片类型
type DayCard = {
  date: string; // YYYY-MM-DD 格式
  dateDisplay: string; // 显示用的日期格式
  moments: Moment[]; // 该天的所有时刻
};

// 按月份分组的卡片类型
type MonthCard = {
  month: string; // YYYY-MM 格式
  monthDisplay: string; // 显示用的月份格式
  dayCards: DayCard[]; // 该月的所有日期卡片
};


export default function MomentsPage() {
  const { moments, loading, refreshMoments, deleteMoment } = useAppContext();
  const { t, language } = useLanguage(); // 获取翻译函数和语言设置
  const [filteredMoments, setFilteredMoments] = useState<Moment[]>([]);
  const [dayCards, setDayCards] = useState<DayCard[]>([]);
  const [monthCards, setMonthCards] = useState<MonthCard[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null); // 用于存储要删除的moment
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false); // 新增状态控制搜索栏显示
  const [isMobile, setIsMobile] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  
  // 折叠状态管理
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  // 格式化日期显示 - 只显示几号（使用 UTC 时间避免时区问题）
  const formatDateDisplay = (dateString: string) => {
    // 如果日期字符串是 ISO 格式，直接提取日期部分
    if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      return datePart.split('-')[2]; // 只返回日期部分
    }
    // 否则使用 UTC 时间提取日期
    const date = new Date(dateString);
    const day = String(date.getUTCDate());
    return day;
  };

  // 将日期字符串转换为 YYYY-MM-DD 格式用于分组（使用 UTC 时间避免时区问题）
  const getDateKey = (dateString: string): string => {
    // 如果日期字符串是 ISO 格式，直接提取日期部分
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    // 否则使用 UTC 时间提取日期
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 格式化月份显示 - 显示为"月份（年份）"格式
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${parseInt(month)}月（${year}）`;
  };

  // 获取月份键（YYYY-MM）
  const getMonthKey = (dateString: string): string => {
    const dateKey = getDateKey(dateString);
    return dateKey.substring(0, 7); // 提取 YYYY-MM
  };

  // 按日期分组时刻
  const groupMomentsByDate = (moments: Moment[]): DayCard[] => {
    const grouped = new Map<string, Moment[]>();
    
    moments.forEach(moment => {
      const dateKey = getDateKey(moment.created_at);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(moment);
    });
    
    // 转换为数组并按日期排序（最新的在前）
    const cards: DayCard[] = Array.from(grouped.entries())
      .map(([dateKey, moments]) => ({
        date: dateKey,
        dateDisplay: formatDateDisplay(moments[0].created_at),
        moments: moments.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return cards;
  };

  // 按月份分组日期卡片
  const groupDaysByMonth = (dayCards: DayCard[]): MonthCard[] => {
    const grouped = new Map<string, DayCard[]>();
    
    dayCards.forEach(dayCard => {
      const monthKey = getMonthKey(dayCard.date);
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(dayCard);
    });
    
    // 转换为数组并按月份排序（最新的在前）
    const cards: MonthCard[] = Array.from(grouped.entries())
      .map(([monthKey, dayCards]) => ({
        month: monthKey,
        monthDisplay: formatMonthDisplay(monthKey),
        dayCards: dayCards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }))
      .sort((a, b) => new Date(b.month + '-01').getTime() - new Date(a.month + '-01').getTime());
    
    return cards;
  };

  // 切换月份折叠状态
  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  // 切换日期折叠状态
  const toggleDay = (dateKey: string) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 初始过滤和分组
  useEffect(() => {
    setFilteredMoments(moments);
    const days = groupMomentsByDate(moments);
    setDayCards(days);
    setMonthCards(groupDaysByMonth(days));
  }, [moments]);

  const performSearch = () => {
    let results = [...moments];
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(m =>
        m.content?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredMoments(results);
    const days = groupMomentsByDate(results);
    setDayCards(days);
    setMonthCards(groupDaysByMonth(days));
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredMoments(moments); // 显示全部帖子
    const days = groupMomentsByDate(moments);
    setDayCards(days);
    setMonthCards(groupDaysByMonth(days));
  };

  const handleAddMoment = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalSuccess = () => {
    refreshMoments();
    setIsModalOpen(false);
  };

  // 修改 handleDelete 函数以实现即时关闭面板
  const handleDelete = async () => {
    if (!selectedMoment) return;

    // --- 关键修改：立即关闭确认面板和清除选中项 ---
    setShowConfirm(false);
    const momentToDelete = selectedMoment; // 保存要删除的moment引用
    setSelectedMoment(null); // 立即清除选中项

    try {
      // 使用全局状态中的删除函数
      await deleteMoment(momentToDelete.id, momentToDelete.image_path);
      // 乐观更新已完成，无需额外操作
    } catch (err) {
      console.error("删除异常:", err);
      alert(t("deleteFailed") || "删除失败，请稍后重试");
      // 如果删除失败，刷新数据以确保状态同步
      refreshMoments();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/30 via-white/30 to-orange-100/30 rounded-3xl shadow-lg border border-gray-200/50 backdrop-blur-lg">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/40 backdrop-blur-md p-2 rounded-full shadow-sm">
                <Camera size={24} className="text-gray-700" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">{t("moments") || "我的时刻"}</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* AI时刻助手按钮 */}
              <Button 
                variant="outline" 
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center gap-1"
              >
                <Sparkles size={16} /> 
                {t("aiMomentAssistant") || "AI时刻助手"}
              </Button>
              {/* 搜索按钮 */}
              <Button 
                variant="outline" 
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-1"
              >
                <Search size={16} /> 
                {showSearch ? t("collapseSearch") || '折叠搜索栏' : t("search") || '搜索'}
              </Button>
              <Button onClick={handleAddMoment}>{t("addNewMoment") || '+ 记录新时刻'}</Button>
            </div>
          </div>

          {/* 搜索栏 - 条件渲染 */}
          {showSearch && (
            <div className="p-4 border-t border-gray-200/50">
              <div className="flex gap-2 items-center">
                <Input 
                  placeholder={t("searchPlaceholder") || "输入搜索内容~"} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      performSearch();
                    }
                  }}
                  className="flex-1 h-10"
                />
                <Button 
                  onClick={performSearch} 
                  className="flex items-center justify-center h-10 px-4"
                >
                  <Search size={16} className="mr-1" /> {t("search") || "搜索"}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={clearSearch} 
                  className="h-10 px-4"
                  disabled={!searchTerm}
                >
                  <X size={16} className="mr-1" /> {t("clear") || "清空"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI对话面板 */}
      <AIChatPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        title={t("aiMomentAssistant") || "AI时刻助手"}
        greeting={t("aiMomentAssistantGreeting") || "你好！我是你的AI时刻助手，专注于和你聊生活相关的话题。让我们一起分享生活中的美好瞬间吧！🌟"}
        systemPrompt={
          language === "en"
            ? "You are the user's AI Moment Assistant, focused on chatting about life-related topics. Please strictly follow these rules:\n" +
              "1. Your responses must be relaxed, natural, and close to life, using the same language as the user. Please respond in English.\n" +
              "2. Based on the life moments and experiences shared by the user, provide empathy and understanding.\n" +
              "3. You can share life tips, interesting stories, life insights, etc.\n" +
              "4. Keep the conversation light and pleasant, making users feel the beauty of life.\n" +
              "5. When users share joy, celebrate together; when users encounter difficulties, provide encouragement and support."
            : "你是用户的 AI 时刻助手，专注于聊生活相关的话题。请严格遵守以下规则：\n" +
              "1. 回答必须轻松、自然、贴近生活，且使用与用户相同的语言。请使用中文回复。\n" +
              "2. 基于用户分享的生活时刻和经历，给予共鸣和理解。\n" +
              "3. 可以分享生活小贴士、有趣的故事、生活感悟等。\n" +
              "4. 保持对话的轻松愉快，让用户感受到生活的美好。\n" +
              "5. 当用户分享快乐时，一起庆祝；当用户遇到困难时，给予鼓励和支持。"
        }
      />

      {/* 内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className={`flex-1 transition-all duration-300 ${showAIPanel ? 'lg:ml-96' : ''}`}>
        <div className="p-4 pt-0">
          <div className="max-w-6xl mx-auto">
            <div className="space-y-6">
              {monthCards.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? t("noMatches") || "没有找到匹配的时刻记录" : t("noRecords") || "暂无时刻记录，点击上方按钮记录第一个时刻吧！"}
                </div>
              ) : (
                monthCards.map((monthCard) => {
                  const isMonthCollapsed = collapsedMonths.has(monthCard.month);
                  
                  return (
                    <Card 
                      key={monthCard.month} 
                      className="bg-gradient-to-br from-purple-100/30 via-white/30 to-pink-100/30 backdrop-blur-lg p-4 rounded-3xl shadow-lg border border-black w-full max-w-3xl mx-auto"
                    >
                      <div className="flex flex-col gap-4">
                        {/* 月份标题 - 带折叠按钮 */}
                        <div 
                          className="flex items-center gap-2 border-b border-gray-200/50 pb-2 cursor-pointer hover:bg-gray-50/50 rounded-lg p-2 -m-2 transition-colors"
                          onClick={() => toggleMonth(monthCard.month)}
                        >
                          <button className="flex items-center justify-center w-6 h-6 hover:bg-gray-200 rounded transition-colors">
                            {isMonthCollapsed ? (
                              <ChevronDown size={16} className="text-gray-600" />
                            ) : (
                              <ChevronUp size={16} className="text-gray-600" />
                            )}
                          </button>
                          <h2 className="text-xl font-bold text-gray-800 flex-1">{monthCard.monthDisplay}</h2>
                        </div>
                        
                        {/* 该月的所有日期卡片 */}
                        {!isMonthCollapsed && (
                          <div className="space-y-4 pl-2">
                            {monthCard.dayCards.map((dayCard) => {
                              const isDayCollapsed = collapsedDays.has(dayCard.date);
                              
                              return (
                                <Card 
                                  key={dayCard.date} 
                                  className="bg-gradient-to-br from-blue-100/30 via-white/30 to-orange-100/30 backdrop-blur-lg p-4 rounded-2xl shadow-md border border-black"
                                >
                                  <div className="flex flex-col gap-4">
                                    {/* 日期标题 - 带折叠按钮 */}
                                    <div 
                                      className="flex items-center gap-2 border-b border-gray-200/50 pb-2 cursor-pointer hover:bg-gray-50/50 rounded-lg p-2 -m-2 transition-colors"
                                      onClick={() => toggleDay(dayCard.date)}
                                    >
                                      <button className="flex items-center justify-center w-5 h-5 hover:bg-gray-200 rounded transition-colors">
                                        {isDayCollapsed ? (
                                          <ChevronDown size={14} className="text-gray-600" />
                                        ) : (
                                          <ChevronUp size={14} className="text-gray-600" />
                                        )}
                                      </button>
                                      <h3 className="text-lg font-semibold text-gray-700 flex-1">{dayCard.dateDisplay}</h3>
                                    </div>
                                    
                                    {/* 该天的所有时刻内容 */}
                                    {!isDayCollapsed && (
                                      <div className="space-y-4">
                                        {dayCard.moments.map((moment) => (
                                          <div 
                                            key={moment.id} 
                                            className="flex flex-col gap-3 group/item relative"
                                          >
                                            {/* 删除按钮 - 只在hover时显示，右侧居中 */}
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
                                              <Trash2 
                                                size={18} 
                                                className="cursor-pointer text-gray-400 hover:text-orange-400" 
                                                onClick={(e) => { 
                                                  e.stopPropagation();
                                                  setSelectedMoment(moment); 
                                                  setShowConfirm(true); 
                                                }} 
                                              />
                                            </div>
                                            
                                            {/* 文字内容 */}
                                            {moment.content && (
                                              <div className="min-w-0 pr-8">
                                                <p className="text-lg text-gray-700 whitespace-pre-line">
                                                  {moment.content}
                                                </p>
                                              </div>
                                            )}
                                            
                                            {/* 图片 */}
                                            {moment.image_url && (
                                              <div className="flex justify-center">
                                                <div className="relative">
                                                  <img 
                                                    src={moment.image_url} 
                                                    alt="时刻图片" 
                                                    className="w-full max-w-md h-auto rounded-lg object-cover" 
                                                  />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <MomentModal isOpen={isModalOpen} onClose={handleModalClose} onSuccess={handleModalSuccess} />

      {/* 修改确认对话框 - 确保在 selectedMoment 存在时才渲染 */}
      {showConfirm && selectedMoment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-100 via-white to-orange-100 p-4 rounded-2xl shadow-md border border-gray-300 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">{t("confirmDelete") || "确认删除这条时刻吗？"}</h2>
            <p className="text-gray-600 text-base mb-4 text-center">{t("cannotRecover") || "删除后不可恢复"}</p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => { 
                  setShowConfirm(false); 
                  setSelectedMoment(null); // 点击取消也清除选中项
                }}
                className="px-4 py-2 rounded-lg font-semibold transition-colors border-2 border-black bg-white text-black hover:bg-black hover:text-white hover:border-black text-base"
              >
                {t("cancel") || "取消"}
              </button>
              <button 
                className="px-4 py-2 rounded-lg font-semibold transition-colors border-2 border-red-500 bg-white text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 text-base" 
                onClick={handleDelete} // 点击后立即关闭面板
              >
                {t("confirm") || "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}