// app/goals/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Trash2, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { GoalModal } from "../components/GoalModal";
import { HabitModal } from "../components/HabitModal";
import { Calendar } from "../components/Calendar";
import { AIGoalPlanningPanel } from "../components/AIGoalPlanningPanel";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext';

type Goal = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  image_path?: string | null;
  status?: string;
  due_date?: string | null;
  progress?: number;
};

type Habit = {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  color: string | null;
  created_at: string;
  last_checkin?: string | null;
  checkin_count?: number;
  date?: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  planData?: {
    daily: { title: string, description: string }[];
    future: { title: string, description: string }[];
  } | null;
};

export default function GoalsPage() {
  const { goals, habits, loading, refreshGoals, refreshHabits, deleteGoal, updateGoal, checkinHabit } = useAppContext();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("schedulePlanning");
  const tabs = ["schedulePlanning", "myHabits"];
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [rightViewMode, setRightViewMode] = useState<"migration" | "schedule">("migration");
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ 
    type: 'goal' | 'habit', 
    id: number, 
    name: string, 
    imagePath?: string | null 
  } | null>(null);


  // 将Date对象转换为YYYY-MM-DD格式（本地时间）
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 根据选中日期过滤目标
  const getGoalsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = formatDateToLocal(date);
    return goals.filter(goal => {
      if (!goal.due_date) return false;
      // 直接比较字符串，避免时区转换问题
      return goal.due_date === dateStr;
    });
  };

  const selectedDateGoals = getGoalsForDate(selectedDate);
  
  // 获取所有有日期的目标，用于日历显示
  const goalsWithDates = goals.filter(g => g.due_date).map(g => ({ date: g.due_date! }));
  
  // 获取迁移列表（无日期的目标）
  const migrationListGoals = goals.filter(g => !g.due_date);

  // 计算距离上次打卡的天数
  const daysSinceLastCheckin = (lastCheckinDate?: string | null): number | null => {
    if (!lastCheckinDate) return null;
    const lastCheckin = new Date(lastCheckinDate);
    const today = new Date();
    const diffTime = today.getTime() - lastCheckin.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    // 立即关闭确认面板和清除选中项（关键修复）
    setShowConfirm(false);
    setSelectedItem(null);

    try {
      if (selectedItem.type === 'goal') {
        // 从全局状态中删除目标
        await deleteGoal(selectedItem.id, selectedItem.imagePath);
      } else {
        // 注意：这里应该是删除习惯，但目前deleteHabit还没实现
        console.error("删除习惯功能尚未实现");
        alert(t("deleteHabitNotImplemented") || "删除习惯功能尚未实现");
      }
    } catch (err) {
      console.error("删除异常:", err);
      alert(t("deleteFailed") || "删除失败，请稍后重试");
      // 如果删除失败，重新刷新数据以确保状态同步
      refreshGoals();
    }
  };


  const handleCheckin = async (habitId: number) => {
    try {
      await checkinHabit(habitId);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("checkinFailed") || "打卡失败");
    }
  };

  // AI智能规划发送消息
  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput.trim(),
      planData: null
    };

    // 先将用户消息添加到状态中，提供即时反馈
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: userMessage.content
            }
          ],
          purpose: 'planning',
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply,
        planData: data.plan || null,
      };

      // 将 AI 的回复也添加到状态中
      setAiMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t("aiError") || '抱歉，出了点问题，请稍后再试。',
        planData: null
      };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAiMessage();
    }
  };

  // 从AI回复中解析任务并添加到迁移列表（不设置日期）
  const addTasksFromAIReply = async (plan: { daily: { title: string, description: string }[], future: { title: string, description: string }[] }) => {
    const { daily, future } = plan;
    
    // 获取当前用户信息
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) {
      throw new Error(t("pleaseLogin") || "请先登录");
    }

    // 合并所有任务（daily 和 future）都添加到迁移列表（不设置日期）
    const allTasks = [...daily, ...future];
    
    for (const task of allTasks) {
      const { title, description } = task;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title,
        description,
        // 不设置 due_date，这样会添加到迁移列表
        due_date: null,
      });

      if (error) {
        console.error("添加目标失败:", error);
        throw new Error(`${t("addFailed") || "添加失败"}: "${title}"`);
      }
    }

    // 刷新目标列表
    refreshGoals();
  };


  if (loading.goals || loading.habits) return <div className="text-center py-8">{t("loadingGoals") || "目标加载中..."}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/70 via-white/70 to-orange-100/70 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-md">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{t("myGoals") || "我的目标"}</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* AI智能规划按钮 */}
              <Button 
                variant="outline" 
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center gap-1"
              >
                <Sparkles size={16} /> 
                {t("aiPlanning") || "AI智能规划"}
              </Button>
              <Button onClick={() => {
                if (activeTab === "myHabits") {
                  setIsHabitModalOpen(true);
                } else {
                  setIsGoalModalOpen(true);
                }
              }}>
                + {t("new")} {activeTab === "myHabits" ? t("habit") : t("goal")}
              </Button>
            </div>
          </div>

          {/* Tab 栏 */}
          <div className="px-4 pb-4">
            <div className="flex space-x-4 border-b">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 font-medium transition-colors duration-200 ${activeTab === tab ? 'border-b-2 border-orange-400 text-orange-400' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {t(tab) || tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI智能规划面板 */}
      <AIGoalPlanningPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        greeting={t("aiPlanningGreeting") || (language === "en" 
          ? "Hello! I'm your AI Planning Assistant. Tell me what goal you want to achieve, and I'll help you break it down into actionable sub-goals. 🎯"
          : "你好！我是你的AI规划助手。请告诉我你想完成什么目标，我会帮你拆解成可执行的小目标。🎯")}
        systemPrompt={
          language === "en"
            ? "You are the user's AI Planning Assistant, focused on breaking down large goals into actionable sub-goals. Please strictly follow these rules:\n" +
              "1. Your responses must be clear, actionable, and structured, using the same language as the user. Please respond in English.\n" +
              "2. When users share a large goal, break it down into multiple smaller, executable sub-goals.\n" +
              "3. You must provide a structured plan in JSON format with 'tasksDaily' and 'tasksFuture' arrays.\n" +
              "4. 'tasksDaily' should contain immediate actionable tasks, 'tasksFuture' should contain medium-term sub-goals.\n" +
              "5. Each task should have a clear title (≤30 characters) and description.\n" +
              "6. Always generate the JSON plan when users express planning intentions."
            : "你是用户的 AI 规划助手，专注于将大目标拆分成可执行的小目标。请严格遵守以下规则：\n" +
              "1. 回答必须清晰、可执行、结构化，且使用与用户相同的语言。请使用中文回复。\n" +
              "2. 当用户分享大目标时，将其拆解成多个可执行的小目标。\n" +
              "3. 必须提供结构化的计划，使用 JSON 格式，包含 'tasksDaily' 和 'tasksFuture' 两个数组。\n" +
              "4. 'tasksDaily' 应包含立即可执行的任务，'tasksFuture' 应包含中期的小目标。\n" +
              "5. 每个任务应有清晰的标题（≤30字符）和描述。\n" +
              "6. 当用户表达规划意图时，必须生成 JSON 计划。"
        }
        onAddGoals={addTasksFromAIReply}
      />

      {/* 内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className={`flex-1 transition-all duration-300 ${showAIPanel ? 'lg:ml-96' : ''}`}>
        <div className="p-4 pt-0">
          <div className="max-w-6xl mx-auto">
            <div>
              {activeTab === "schedulePlanning" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左侧日历 */}
                  <div>
                    <Calendar
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      goalsWithDates={goalsWithDates}
                    />
                  </div>
                  
                  {/* 右侧目标列表 */}
                  <div>
                    <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg border border-orange-200 relative">
                      {/* 标题和切换按钮 */}
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-800">
                          {rightViewMode === "migration" 
                            ? t("migrationList") || "迁移列表"
                            : selectedDate 
                              ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
                              : t("selectDate") || "请选择日期"}
                        </h3>
                        <button
                          onClick={() => {
                            setRightViewMode(prev => prev === "migration" ? "schedule" : "migration");
                          }}
                          className="p-2 rounded-lg bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-800 transition-all duration-200 flex items-center gap-2"
                          title={t("switchPanel") || "切换面板"}
                        >
                          <RefreshCw size={18} />
                          <span className="text-sm font-medium">{t("switchPanel") || "切换面板"}</span>
                        </button>
                      </div>

                      {/* 迁移列表视图 */}
                      {rightViewMode === "migration" && (
                        <div>
                          {migrationListGoals.length === 0 && (
                            <p className="text-gray-500 text-sm mb-4">{t("noMigrationGoals") || "迁移列表为空，新建目标将自动添加到这里"}</p>
                          )}
                          <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {migrationListGoals.map(goal => {
                              const isCompleted = goal.status === 'completed';
                              return (
                                <div
                                  key={goal.id}
                                  className={`bg-white/80 p-5 rounded-2xl shadow-md border border-orange-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                                    isCompleted ? 'opacity-75' : ''
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        {!isCompleted && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await updateGoal(goal.id, { status: 'completed' });
                                                refreshGoals();
                                              } catch (err) {
                                                alert(err instanceof Error ? err.message : t("updateFailed") || "更新失败");
                                              }
                                            }}
                                            className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors duration-200 flex items-center justify-center flex-shrink-0"
                                            title={t("completeGoal") || "完成目标"}
                                          >
                                            <CheckCircle2 size={18} />
                                          </button>
                                        )}
                                        <h4 className={`font-bold text-lg ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                          {goal.title}
                                        </h4>
                                        {isCompleted && (
                                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                            {t("completed") || "已完成"}
                                          </span>
                                        )}
                                      </div>
                                      {goal.description && (
                                        <p className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                          {goal.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!isCompleted && selectedDate && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              const dateStr = formatDateToLocal(selectedDate);
                                              await updateGoal(goal.id, { due_date: dateStr });
                                              refreshGoals();
                                              // 迁移成功后自动切换到日程视图
                                              setRightViewMode("schedule");
                                            } catch (err) {
                                              alert(err instanceof Error ? err.message : t("migrateFailed") || "迁移失败");
                                            }
                                          }}
                                          className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 flex items-center justify-center"
                                          title={t("migrate") || "迁移"}
                                        >
                                          <ArrowRight size={18} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setSelectedItem({ 
                                            type: 'goal', 
                                            id: goal.id, 
                                            name: goal.title,
                                            imagePath: goal.image_path 
                                          });
                                          setShowConfirm(true);
                                        }}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
                                        title={t("delete") || "删除"}
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </div>
                                  {!selectedDate && !isCompleted && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      {t("selectDateToMigrate") || "请先选择日历中的日期，然后点击迁移按钮"}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 日程视图 */}
                      {rightViewMode === "schedule" && (
                        <div>
                          {selectedDateGoals.length === 0 && (
                            <p className="text-gray-500 text-sm mb-4">{t("noGoalsForDate") || "该日期暂无目标"}</p>
                          )}
                          <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {selectedDateGoals.map(goal => {
                              const isCompleted = goal.status === 'completed';
                              return (
                                <div
                                  key={goal.id}
                                  className={`bg-white/80 p-5 rounded-2xl shadow-md border border-orange-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                                    isCompleted ? 'opacity-75' : ''
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        {!isCompleted && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await updateGoal(goal.id, { status: 'completed' });
                                                refreshGoals();
                                              } catch (err) {
                                                alert(err instanceof Error ? err.message : t("updateFailed") || "更新失败");
                                              }
                                            }}
                                            className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors duration-200 flex items-center justify-center flex-shrink-0"
                                            title={t("completeGoal") || "完成目标"}
                                          >
                                            <CheckCircle2 size={18} />
                                          </button>
                                        )}
                                        <h4 className={`font-bold text-lg ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                          {goal.title}
                                        </h4>
                                        {isCompleted && (
                                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                            {t("completed") || "已完成"}
                                          </span>
                                        )}
                                      </div>
                                      {goal.description && (
                                        <p className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                          {goal.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!isCompleted && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              await updateGoal(goal.id, { due_date: null });
                                              refreshGoals();
                                              // 迁回成功后自动切换到迁移列表视图
                                              setRightViewMode("migration");
                                            } catch (err) {
                                              alert(err instanceof Error ? err.message : t("moveBackFailed") || "迁回失败");
                                            }
                                          }}
                                          className="p-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors duration-200 flex items-center justify-center"
                                          title={t("moveBack") || "迁回"}
                                        >
                                          <ArrowLeft size={18} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setSelectedItem({ 
                                            type: 'goal', 
                                            id: goal.id, 
                                            name: goal.title,
                                            imagePath: goal.image_path 
                                          });
                                          setShowConfirm(true);
                                        }}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
                                        title={t("delete") || "删除"}
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "myHabits" && (
                <div className="space-y-4">
                  {habits.map(habit => {
                    const daysSince = daysSinceLastCheckin(habit.last_checkin);
                    const today = new Date();
                    const lastCheckinDate = habit.last_checkin ? new Date(habit.last_checkin) : null;
                    const isToday = lastCheckinDate && 
                      lastCheckinDate.getDate() === today.getDate() &&
                      lastCheckinDate.getMonth() === today.getMonth() &&
                      lastCheckinDate.getFullYear() === today.getFullYear();
                    
                    return (
                      <Card 
                        key={habit.id} 
                        className={`p-4 rounded-3xl shadow-lg border border-orange-200 ${
                          isToday 
                            ? 'bg-gradient-to-r from-orange-200 to-yellow-100 text-gray-800' 
                            : 'bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center mb-2">
                              <h4 className="font-bold text-lg text-gray-800">{habit.name}</h4>
                              <div className="flex items-center ml-3 space-x-2">
                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                                  {t(habit.frequency) || habit.frequency}
                                </span>
                                <Trash2 
                                  size={18} 
                                  className="cursor-pointer hover:text-orange-400" 
                                  onClick={() => {
                                    setSelectedItem({ 
                                      type: 'habit', 
                                      id: habit.id, 
                                      name: habit.name
                                    });
                                    setShowConfirm(true);
                                  }} 
                                />
                              </div>
                            </div>
                            <p className="text-gray-500 mb-3">{habit.description}</p>
                            <div className="flex items-center text-green-600">
                              <span className="ml-2 text-sm">{t("checkinCount")} {habit.checkin_count || 0} {t("times")}</span>
                              {daysSince !== null && (
                                <span className="ml-3 text-sm text-gray-500">{t("lastCheckin")} {daysSince} {t("daysAgo")}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {isToday ? (
                              <Button
                                variant="primary"
                                className="px-6 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                              >
                                {t("checkedIn") || "已打卡"}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleCheckin(habit.id)}
                                className="px-6 py-2 text-sm rounded-lg bg-black text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white"
                              >
                                {t("checkin") || "打卡"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={refreshGoals}
        selectedDate={selectedDate}
      />

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSuccess={refreshHabits}
      />

      {showConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-center">
              {t("confirmDelete")} {selectedItem.name} {selectedItem.type === 'goal' ? t("goal") : t("habit")}{t("questionMark") || "吗？"}
            </h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              {t("cannotRecover") || "删除后无法恢复。"}
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedItem(null);
                }}
              >
                {t("cancel") || "取消"}
              </Button>
              <Button
                variant="primary"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDelete}
              >
                {t("confirm") || "确认删除"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}