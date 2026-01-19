"use client";

import React, { useMemo, useState } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { CheckCircle2, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext';

type Moment = {
  id: number;
  created_at: string;
  content: string;
  image_url?: string | null;
  image_path?: string | null;
  date?: string;
};

type Goal = {
  id: number;
  title: string;
  description: string;
  status: string;
  due_date?: string | null;
  progress: number;
};

type Habit = {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  color: string | null;
  last_checkin?: string | null;
  checkin_count?: number;
};

// 按日期分组的卡片类型
type DayCard = {
  date: string; // YYYY-MM-DD 格式
  dateDisplay: string; // 显示用的日期格式
  moments: Moment[]; // 该天的所有时刻
};

export default function HomePage() {
  const { moments, goals, habits, loading, refreshGoals, refreshHabits, checkinHabit, updateGoal } = useAppContext();
  const { t, language } = useLanguage();
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  // 格式化日期显示 - 只显示几号
  const formatDateDisplay = (dateString: string) => {
    if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      return datePart.split('-')[2];
    }
    const date = new Date(dateString);
    const day = String(date.getUTCDate());
    return day;
  };

  // 将日期字符串转换为 YYYY-MM-DD 格式用于分组
  const getDateKey = (dateString: string): string => {
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 格式化完整日期显示
  const formatFullDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
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
    
    const cards: DayCard[] = Array.from(grouped.entries())
      .map(([dateKey, moments]) => ({
        date: dateKey,
        dateDisplay: formatFullDateDisplay(moments[0].created_at),
        moments: moments.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return cards;
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

  // 获取近一周的moments并按日期分组
  const recentMomentsByDate = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const filtered = moments.filter(moment => {
      const momentDate = new Date(moment.created_at);
      return momentDate >= oneWeekAgo;
    });
    
    return groupMomentsByDate(filtered);
  }, [moments]);

  // 获取今日的goals
  const todayGoals = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return goals.filter(goal => goal.due_date === todayStr);
  }, [goals]);

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  // 检查习惯今天是否已打卡
  const isTodayChecked = (habit: Habit) => {
    if (!habit.last_checkin) return false;
    const lastCheckin = new Date(habit.last_checkin);
    const today = new Date();
    return lastCheckin.getDate() === today.getDate() &&
           lastCheckin.getMonth() === today.getMonth() &&
           lastCheckin.getFullYear() === today.getFullYear();
  };

  // 格式化打卡日期显示
  const formatCheckinDate = (dateString?: string | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (language === 'zh') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  // 处理习惯打卡
  const handleCheckin = async (habitId: number) => {
    try {
      await checkinHabit(habitId);
      // 打卡后刷新数据
      await refreshHabits();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("checkinFailed") || "打卡失败");
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto -mt-8">
      <div className="max-w-7xl mx-auto pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧：近一周的记录 */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-100 p-4 rounded-[28px]">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Camera size={20} />
                  {t("recentRecords") || "近一周记录"}
                </h3>
              </div>
              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {loading.moments ? (
                  <div className="text-center py-8 text-gray-500">{t("loading") || "加载中..."}</div>
                ) : recentMomentsByDate.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t("noRecentRecords") || "暂无近一周的记录"}
                  </div>
                ) : (
                  recentMomentsByDate.map((dayCard) => {
                    const isDayCollapsed = collapsedDays.has(dayCard.date);
                    return (
                      <Card 
                        key={dayCard.date} 
                        className="bg-white/80 p-4 rounded-[28px] shadow-md"
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
                  })
                )}
              </div>
            </Card>
          </div>

          {/* 右侧：上半部分 - 习惯面板 */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg border border-gray-200">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800">{t("myHabits") || "我的习惯"}</h3>
              </div>
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading.habits ? (
                  <div className="text-center py-4 text-gray-500 text-sm">{t("loading") || "加载中..."}</div>
                ) : habits.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    {t("noHabits") || "暂无习惯"}
                  </div>
                ) : (
                  habits.slice(0, 5).map((habit: Habit) => {
                    const isChecked = isTodayChecked(habit);
                    return (
                      <div
                        key={habit.id}
                        className={`group bg-white/80 p-5 rounded-2xl shadow-md border border-gray-200 ${
                          isChecked ? 'bg-gradient-to-r from-orange-200/80 to-yellow-100/80' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-lg text-gray-800">{habit.name}</h4>
                              {habit.frequency !== "每日" && (
                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                                  {t(habit.frequency) || habit.frequency}
                                </span>
                              )}
                            </div>
                            {habit.description && (
                              <p className="text-sm text-gray-600 mb-2">{habit.description}</p>
                            )}
                            <div className="flex flex-col text-green-600">
                              <span className="text-sm">{t("checkinCount")} {habit.checkin_count || 0} {t("times")}</span>
                              {habit.last_checkin && (
                                <span className="text-sm text-gray-500 mt-1">{t("lastCheckin")}{formatCheckinDate(habit.last_checkin)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center ml-4">
                            {isChecked ? (
                              <Button
                                variant="ghost"
                                className="px-6 py-2 text-sm rounded-lg bg-white/40 backdrop-blur-md text-black shadow-sm cursor-default"
                                disabled
                              >
                                {t("checkedIn") || "已打卡"}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleCheckin(habit.id)}
                                className="px-6 py-2 text-sm rounded-3xl border-2 border-[#003049] bg-[#003049] text-white hover:bg-white hover:text-[#003049] transition-colors duration-200"
                              >
                                {t("checkin") || "打卡"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* 右侧：下半部分 - 今日任务面板 */}
            <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg border border-gray-200">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  {t("todayTasks") || "今日任务"}
                </h3>
              </div>
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading.goals ? (
                  <div className="text-center py-4 text-gray-500 text-sm">{t("loading") || "加载中..."}</div>
                ) : todayGoals.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    {t("noTasksToday") || "今日暂无任务"}
                  </div>
                ) : (
                  todayGoals.map((goal: Goal) => {
                    const isCompleted = goal.status === 'completed';
                    return (
                      <div
                        key={goal.id}
                        className={`group bg-[#efeeeb] p-5 rounded-[28px] ${
                          isCompleted ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4">
                          {!isCompleted && (
                            <button
                              onClick={async () => {
                                try {
                                  await updateGoal(goal.id, { status: 'completed' });
                                  await refreshGoals();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : t("updateFailed") || "更新失败");
                                }
                              }}
                              className="p-1.5 rounded-full bg-[#b2ff9e] hover:bg-[#b2ff9e]/80 transition-colors duration-200 flex items-center justify-center flex-shrink-0"
                              title={t("completeGoal") || "完成目标"}
                            >
                              <CheckCircle2 size={18} className="text-[#003049]" />
                            </button>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className={`font-bold text-lg ${isCompleted ? 'line-through text-[#003049]/50' : 'text-[#003049]'}`}>
                                {goal.title}
                              </h4>
                              {isCompleted && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                  {t("completed") || "已完成"}
                                </span>
                              )}
                            </div>
                            {goal.description && (
                              <p className={`text-sm ${isCompleted ? 'text-[#003049]/50 line-through' : 'text-[#003049]'}`}>
                                {goal.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
