"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Trash2, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { MomentModal } from "../components/MomentModal";
import { AssistantDrawer } from "../components/AssistantDrawer";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext';
import { useTopBar } from '../components/layout/TopBar';
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useToast } from "../components/ui/Toast";
import { PlainImage } from "../components/ui/PlainImage";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";

type Moment = {
  id: number;
  created_at: string;
  content: string;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

type DayCard = {
  date: string;
  dateDisplay: string;
  moments: Moment[];
};

type MonthCard = {
  month: string;
  monthDisplay: string;
  dayCards: DayCard[];
};


export default function MomentsPageClient() {
  const { moments, loading, refreshMoments, deleteMoment } = useAppContext();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [deletingMoment, setDeletingMoment] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const formatDateDisplay = (dateString: string) => {
    if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      return datePart.split('-')[2];
    }

    const date = new Date(dateString);
    return String(date.getUTCDate());
  };

  const getDateKey = useCallback((dateString: string): string => {
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }

    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${parseInt(month)}月（${year}）`;
  };

  const getMonthKey = useCallback((dateString: string): string => {
    const dateKey = getDateKey(dateString);
    return dateKey.substring(0, 7);
  }, [getDateKey]);

  const groupMomentsByDate = useCallback((moments: Moment[]): DayCard[] => {
    const grouped = new Map<string, Moment[]>();
    
    moments.forEach(moment => {
      const dateKey = getDateKey(moment.created_at);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(moment);
    });
    
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

  const groupDaysByMonth = useCallback((dayCards: DayCard[]): MonthCard[] => {
    const grouped = new Map<string, DayCard[]>();
    
    dayCards.forEach(dayCard => {
      const monthKey = getMonthKey(dayCard.date);
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(dayCard);
    });
    
    const cards: MonthCard[] = Array.from(grouped.entries())
      .map(([monthKey, dayCards]) => ({
        month: monthKey,
        monthDisplay: formatMonthDisplay(monthKey),
        dayCards: dayCards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }))
      .sort((a, b) => new Date(b.month + '-01').getTime() - new Date(a.month + '-01').getTime());
    
    return cards;
  }, [getMonthKey]);

  const monthCards = useMemo(
    () => groupDaysByMonth(groupMomentsByDate(moments)),
    [groupDaysByMonth, groupMomentsByDate, moments],
  );

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

  const handleAddMoment = useCallback(() => {
    setEditingMoment(null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    setTopBarHandlers({
      onAddMoment: handleAddMoment,
      onToggleAIPanel: () => setShowAIPanel((current) => !current),
    });
  }, [handleAddMoment, setTopBarHandlers]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMoment(null);
  };
  const handleModalSuccess = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedMoment) return;

    const momentToDelete = selectedMoment;
    setDeletingMoment(true);

    try {
      await deleteMoment(momentToDelete.id, momentToDelete.image_path);
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

  if (loading.moments && moments.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="flex min-h-full flex-col">
      <AssistantDrawer
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        title={t("moments") || "记录"}
        placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
        systemPrompt={
          language === "en"
            ? "You are the user's moment companion, focused on chatting about life-related topics. Please strictly follow these rules:\n" +
              "1. Your responses must be relaxed, natural, and close to life, using the same language as the user. Please respond in English.\n" +
              "2. Based on the life moments and experiences shared by the user, provide empathy and understanding.\n" +
              "3. You can share life tips, interesting stories, life insights, etc.\n" +
              "4. Keep the conversation light and pleasant, making users feel the beauty of life.\n" +
              "5. When users share joy, celebrate together; when users encounter difficulties, provide encouragement and support."
            : "你是用户的时刻整理伙伴，专注于聊生活相关的话题。请严格遵守以下规则：\n" +
              "1. 回答必须轻松、自然、贴近生活，且使用与用户相同的语言。请使用中文回复。\n" +
              "2. 基于用户分享的生活时刻和经历，给予共鸣和理解。\n" +
              "3. 可以分享生活小贴士、有趣的故事、生活感悟等。\n" +
              "4. 保持对话的轻松愉快，让用户感受到生活的美好。\n" +
              "5. 当用户分享快乐时，一起庆祝；当用户遇到困难时，给予鼓励和支持。"
        }
      />

      <div className="flex-1">
        <div className="px-0 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="space-y-6">
              {monthCards.length === 0 ? (
                <EmptyState
                  title={t("noRecords") || "暂无记录"}
                  action={<Button onClick={handleAddMoment}>{t("newMoment") || "记录"}</Button>}
                />
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
                                    
                                    {!isDayCollapsed && (
                                      <div className="space-y-4">
                                        {dayCard.moments.map((moment) => (
                                          <div 
                                            key={moment.id} 
                                            className="flex flex-col gap-3 group/item relative"
                                          >
                                            <div className="absolute right-0 top-0 z-10 flex items-center gap-1">
                                              <button
                                                type="button"
                                                className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
                                                title={t("edit") || "编辑"}
                                                aria-label={t("edit") || "编辑"}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingMoment(moment);
                                                  setIsModalOpen(true);
                                                }}
                                              >
                                                <Edit2 size={18} />
                                              </button>
                                              <button
                                                type="button"
                                                className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
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
                                            </div>
                                            
                                            {moment.content && (
                                              <div className="min-w-0 pr-20">
                                                <p className="text-lg text-[var(--color-text-primary)] whitespace-pre-line">
                                                  {moment.content}
                                                </p>
                                              </div>
                                            )}
                                            
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

      <MomentModal
        isOpen={isModalOpen}
        initialMoment={editingMoment}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

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
