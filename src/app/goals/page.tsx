// app/goals/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Trash2 } from "lucide-react";
import { GoalModal } from "../components/GoalModal";
import { HabitModal } from "../components/HabitModal";
import { Calendar } from "../components/Calendar";
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
  const [isAIPlanningOpen, setIsAIPlanningOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ 
    type: 'goal' | 'habit', 
    id: number, 
    name: string, 
    imagePath?: string | null 
  } | null>(null);

  // AI智能规划相关状态
  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t("aiPlanningGreeting") || '你好！我是你的AI规划助手。请告诉我你想完成什么目标，我会帮你拆解成可执行的任务列表。🎯',
      planData: null
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

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

  // 从AI回复中解析任务并添加
  const addTasksFromAIReply = async (plan: { daily: { title: string, description: string }[], future: { title: string, description: string }[] }) => {
    const { daily, future } = plan;
    
    // 获取当前用户信息
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) {
      alert(t("pleaseLogin") || "请先登录");
      return;
    }

    // 添加 Daily 任务（使用今天的日期）
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (const task of daily) {
      const { title, description } = task;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title,
        description,
        due_date: todayStr,
      });

      if (error) {
        console.error("添加今日待办失败:", error);
        alert(`${t("addFailed")} "${title}" ${t("retry")}` || `添加任务 "${title}" 失败，请重试`);
        return;
      }
    }

    // 添加 Future 任务（使用一周后的日期）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    for (const task of future) {
      const { title, description } = task;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title,
        description,
        due_date: futureDateStr,
      });

      if (error) {
        console.error("添加近期目标失败:", error);
        alert(`${t("addFailed")} "${title}" ${t("retry")}` || `添加目标 "${title}" 失败，请重试`);
        return;
      }
    }
    
    alert(`${t("addSuccess")} ${daily.length + future.length} ${t("tasksAdded")}!`);
    refreshGoals();
  };

  // 关闭AI规划面板时重置状态
  const closeAIPlanning = () => {
    setIsAIPlanningOpen(false);
    setAiMessages([
      {
        id: '1',
        role: 'assistant',
        content: t("aiPlanningGreeting") || '你好！我是你的AI规划助手。请告诉我你想完成什么目标，我会帮你拆解成可执行的任务列表。🎯',
        planData: null
      }
    ]);
    setAiInput('');
    setAiLoading(false);
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
              <p className="text-gray-500 mt-1">{t("planForFuture") || "规划未来，成就更好的自己"}</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => setIsAIPlanningOpen(true)}
              >
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

      {/* 内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className="flex-1">
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
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {selectedDate 
                          ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
                          : t("selectDate") || "请选择日期"}
                      </h3>
                      {selectedDateGoals.length === 0 && (
                        <p className="text-gray-500 text-sm">{t("noGoalsForDate") || "该日期暂无目标"}</p>
                      )}
                    </div>
                    <div className="space-y-4">
                      {selectedDateGoals.map(goal => (
                        <Card key={goal.id} className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-bold">{goal.title}</h4>
                              <p className="text-sm text-gray-500">{goal.description}</p>
                            </div>
                            <div className="flex space-x-3 text-gray-400">
                              <Trash2 
                                size={18} 
                                className="cursor-pointer hover:text-orange-400" 
                                onClick={() => {
                                  setSelectedItem({ 
                                    type: 'goal', 
                                    id: goal.id, 
                                    name: goal.title,
                                    imagePath: goal.image_path 
                                  });
                                  setShowConfirm(true);
                                }} 
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
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

      {/* AI智能规划模态框 */}
      {isAIPlanningOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg border border-orange-200 w-full max-w-2xl h-[600px] flex flex-col">
            <div className="p-4 border-b border-orange-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">{t("aiPlanning") || "AI智能规划"}</h3>
                <button 
                  onClick={closeAIPlanning}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 聊天内容区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block p-4 rounded-xl max-w-full ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-gradient-to-r from-orange-200 to-yellow-100 text-gray-800'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>

                    {message.planData && (
                      <div className="mt-3 p-3 bg-white/30 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">{t("aiGeneratedPlan") || "📋 AI生成的计划："}</h4>
                        
                        {message.planData.daily && message.planData.daily.length > 0 && (
                          <div className="mb-3">
                            <h5 className="font-medium text-xs text-gray-600 mb-1">{t("todayTasks")} ({message.planData.daily.length})</h5>
                            <ul className="text-xs space-y-1">
                              {message.planData.daily.map((task, index) => (
                                <li key={index} className="flex">
                                  <span className="mr-1">•</span>
                                  <strong>{task.title}:</strong> {task.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {message.planData.future && message.planData.future.length > 0 && (
                          <div>
                            <h5 className="font-medium text-xs text-gray-600 mb-1">{t("recentGoals")} ({message.planData.future.length})</h5>
                            <ul className="text-xs space-y-1">
                              {message.planData.future.map((task, index) => (
                                <li key={index} className="flex">
                                  <span className="mr-1">•</span>
                                  <strong>{task.title}:</strong> {task.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {message.planData && (
                      <button
                        onClick={() => addTasksFromAIReply(message.planData)}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                      >
                        {t("addTasksToGoals") || "一键添加到目标"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="mb-4 text-left">
                  <div className="bg-gradient-to-r from-orange-200 to-yellow-100 p-4 rounded-xl max-w-full">
                    <p className="text-gray-800">{t("aiThinking") || "AI正在思考中..."}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* 输入区域 */}
            <div className="p-4 border-t border-orange-200">
              <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-orange-200">
                <input 
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={handleAiKeyPress}
                  placeholder={t("aiInputPlaceholder") || "输入你想完成的事情..."}
                  className="flex-1 bg-transparent px-2 focus:outline-none text-gray-700"
                  disabled={aiLoading}
                />
                <button 
                  onClick={sendAiMessage}
                  disabled={aiLoading || !aiInput.trim()}
                  className="p-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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