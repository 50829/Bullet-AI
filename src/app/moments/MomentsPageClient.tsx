// app/moments/page.tsx
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { MomentModal } from "../components/MomentModal";
import { AIChatPanel } from "../components/AIChatPanel";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook
import { useTopBar } from '../components/layout/TopBar';
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useToast } from "../components/ui/Toast";
import { PlainImage } from "../components/ui/PlainImage";

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


export default function MomentsPageClient() {
  const { moments, refreshMoments, deleteMoment } = useAppContext();
  const { t, language } = useLanguage(); // 获取翻译函数和语言设置
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const [monthCards, setMonthCards] = useState<MonthCard[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null); // 用于存储要删除的moment
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [deletingMoment, setDeletingMoment] = useState(false);
  
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
  const getDateKey = useCallback((dateString: string): string => {
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
  }, []);

  // 格式化月份显示 - 显示为"月份（年份）"格式
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${parseInt(month)}月（${year}）`;
  };

  // 获取月份键（YYYY-MM）
  const getMonthKey = useCallback((dateString: string): string => {
    const dateKey = getDateKey(dateString);
    return dateKey.substring(0, 7); // 提取 YYYY-MM
  }, [getDateKey]);

  // 按日期分组时刻
  const groupMomentsByDate = useCallback((moments: Moment[]): DayCard[] => {
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
  }, [getDateKey]);

  // 按月份分组日期卡片
  const groupDaysByMonth = useCallback((dayCards: DayCard[]): MonthCard[] => {
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
  }, [getMonthKey]);

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

  // 初始过滤和分组
  useEffect(() => {
    const days = groupMomentsByDate(moments);
    setMonthCards(groupDaysByMonth(days));
  }, [groupDaysByMonth, groupMomentsByDate, moments]);

  const handleAddMoment = () => setIsModalOpen(true);

  // 注册 TopBar 回调
  useEffect(() => {
    setTopBarHandlers({
      onAddMoment: handleAddMoment,
      onToggleAIPanel: () => setShowAIPanel(!showAIPanel),
      showAIPanel,
    });
  }, [setTopBarHandlers, showAIPanel]);
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalSuccess = () => {
    setIsModalOpen(false);
  };

  // 修改 handleDelete 函数以实现即时关闭面板
  const handleDelete = async () => {
    if (!selectedMoment) return;

    const momentToDelete = selectedMoment; // 保存要删除的moment引用
    setDeletingMoment(true);

    try {
      // 使用全局状态中的删除函数
      await deleteMoment(momentToDelete.id, momentToDelete.image_path);
      showToast({ type: "success", message: t("deleteSuccess") || "删除成功" });
      setShowConfirm(false);
      setSelectedMoment(null);
    } catch (err) {
      console.error("删除异常:", err);
      showToast({ type: "error", message: t("deleteFailed") || "删除失败，请稍后重试" });
      void refreshMoments();
    } finally {
      setDeletingMoment(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* AI对话面板 */}
      <AIChatPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
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
      <div 
        className="flex-1"
      >
        <div className="p-4 pt-0">
          <div className="max-w-6xl mx-auto">
            <div className="space-y-6">
              {monthCards.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {t("noRecords") || "暂无时刻记录，点击上方按钮记录第一个时刻吧！"}
                </div>
              ) : (
                monthCards.map((monthCard) => {
                  const isMonthCollapsed = collapsedMonths.has(monthCard.month);
                  
                  return (
                    <Card 
                      key={monthCard.month} 
                      className="p-4 rounded-xl w-full max-w-3xl mx-auto"
                      style={{ 
                        backgroundColor: 'var(--color-month-card-bg, rgba(243, 244, 246, 1))',
                        border: '1px solid var(--color-border-muted)'
                      }}
                    >
                      <div className="flex flex-col gap-4">
                        {/* 月份标题 - 带折叠按钮 */}
                        <div 
                          className="flex items-center gap-2 border-b border-[var(--color-border-muted)] pb-2 cursor-pointer transition-colors"
                          onClick={() => toggleMonth(monthCard.month)}
                        >
                          <button 
                            className="flex items-center justify-center w-6 h-6 bg-transparent border-none outline-none p-0 m-0 cursor-pointer"
                            style={{ background: 'none', boxShadow: 'none' }}
                          >
                            {isMonthCollapsed ? (
                              <ChevronDown size={16} className="text-theme-primary" />
                            ) : (
                              <ChevronUp size={16} className="text-theme-primary" />
                            )}
                          </button>
                          <h2 className="text-2xl font-semibold text-theme-primary flex-1">{monthCard.monthDisplay}</h2>
                        </div>
                        
                        {/* 该月的所有日期卡片 */}
                        {!isMonthCollapsed && (
                          <div className="space-y-4 pl-2">
                            {monthCard.dayCards.map((dayCard) => {
                              const isDayCollapsed = collapsedDays.has(dayCard.date);
                              
                              return (
                                <Card 
                                  key={dayCard.date} 
                                  className="p-4 rounded-xl"
                                >
                                  <div className="flex flex-col gap-4">
                                    {/* 日期标题 - 带折叠按钮 */}
                                    <div 
                                      className="flex items-center gap-2 border-b border-gray-200/50 pb-2 cursor-pointer hover:bg-gray-50/50 rounded-2xl p-2 -m-2 transition-colors"
                                      onClick={() => toggleDay(dayCard.date)}
                                    >
                                      <button className="flex items-center justify-center w-5 h-5 hover:bg-gray-200 rounded transition-colors">
                                        {isDayCollapsed ? (
                                          <ChevronDown size={14} className="text-gray-600" />
                                        ) : (
                                          <ChevronUp size={14} className="text-gray-600" />
                                        )}
                                      </button>
                                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex-1">{dayCard.dateDisplay}</h3>
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
                                            <button
                                              type="button"
                                              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
                                              title={t("delete") || "删除"}
                                              aria-label={t("delete") || "删除"}
                                              onClick={(e) => { 
                                                e.stopPropagation();
                                                setSelectedMoment(moment); 
                                                setShowConfirm(true); 
                                              }}
                                            >
                                              <Trash2 size={18} />
                                            </button>
                                            
                                            {/* 文字内容 */}
                                            {moment.content && (
                                              <div className="min-w-0 pr-8">
                                                <p className="text-lg text-[var(--color-text-primary)] whitespace-pre-line">
                                                  {moment.content}
                                                </p>
                                              </div>
                                            )}
                                            
                                            {/* 图片 */}
                                            {moment.image_url && (
                                              <div className="flex justify-center">
                                                <div className="relative">
                                                  <PlainImage
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

      <ConfirmDialog
        isOpen={showConfirm && Boolean(selectedMoment)}
        title={t("confirmDelete") || "确认删除这条记录吗？"}
        description={t("cannotRecover") || "删除后不可恢复"}
        confirmLabel={t("confirm") || "确认"}
        cancelLabel={t("cancel") || "取消"}
        loading={deletingMoment}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirm(false);
          setSelectedMoment(null);
        }}
      />
    </div>
  );
}
