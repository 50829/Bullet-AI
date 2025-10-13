// app/goals/page.tsx - 完整版
"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient"; // 添加 Supabase 客户端导入
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Trash2, ArrowUpDown } from "lucide-react";
import { GoalModal } from "../components/GoalModal";
import { HabitModal } from "../components/HabitModal";
import { useAppContext } from "../../context/AppContext";

type Goal = {
  id: number;
  title: string;
  description: string | null;
  type: string; // 添加 type 字段
  priority: string;
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
  last_checkin?: string | null; // 上次打卡时间
  checkin_count?: number; // 打卡次数
  date?: string;
};

// ✅ 修改：为 Message 类型添加 planData 字段
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
  const [activeTab, setActiveTab] = useState("我的习惯");
  const tabs = ["今日待办", "近期目标", "我的习惯"];
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isAIPlanningOpen, setIsAIPlanningOpen] = useState(false);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'goal' | 'habit', id: number, imagePath?: string | null } | null>(null);

  // AI智能规划相关状态
  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的AI规划助手。请告诉我你想完成什么目标，我会帮你拆解成可执行的任务列表。🎯',
      planData: null // 初始化时 planData 为 null
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // 过滤目标和习惯
  const goalsToday = goals.filter(g => g.type === "今日待办");
  const goalsRecent = goals.filter(g => g.type === "近期目标");

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

    try {
      if (selectedItem.type === 'goal') {
        // 从全局状态中删除目标
        await deleteGoal(selectedItem.id, selectedItem.imagePath);
      } else {
        // 注意：这里应该是删除习惯，但目前deleteHabit还没实现
        // 临时使用deleteGoal，实际应用中需要添加deleteHabit函数
        // 如果你有deleteHabit，请替换下面的调用
        // await deleteHabit(selectedItem.id); 
        console.error("删除习惯功能尚未实现");
        alert("删除习惯功能尚未实现");
        return; // 提前返回，不执行刷新
      }
      
      setShowConfirm(false);
      setSelectedItem(null);
      refreshGoals(); // 刷新数据 - 删除操作后可能需要刷新以确保状态同步
    } catch (err) {
      console.error("删除异常:", err);
      alert("删除失败，请稍后重试");
    }
  };

  // 修改 handleMoveGoal，移除 refreshGoals 调用，依赖乐观更新
  const handleMoveGoal = async (goalId: number, currentType: string) => {
    console.log(`[Page DEBUG] 开始移动目标 ID: ${goalId}, 从 "${currentType}" 到 "${currentType === "今日待办" ? "近期目标" : "今日待办"}"`);
    
    const newType = currentType === "今日待办" ? "近期目标" : "今日待办";
    try {
        console.log(`[Page DEBUG] 调用 updateGoal 更新目标 ${goalId} 的类型为 "${newType}"...`);
        await updateGoal(goalId, { type: newType });
        console.log(`[Page DEBUG] updateGoal 调用成功`);

        // --- 移除 refreshGoals 调用 ---
        // console.log(`[Page DEBUG] 调用 refreshGoals 刷新数据...`);
        // await refreshGoals(); // 等待刷新完成
        // console.log(`[Page DEBUG] refreshGoals 完成。`);

        // --- 添加成功提示 ---
        console.log(`[Page SUCCESS] 目标 ${goalId} 类型已更新为 "${newType}"，UI 已更新。`);
        // 可以选择性地添加一个短暂的成功提示
        // alert(`目标已成功移动到 "${newType}"`); // 如果你想显示提示

    } catch (error) {
        console.error("[Page ERROR] 移动目标失败:", error);
        alert("移动失败，操作已回滚，请检查控制台日志或稍后重试");
    }
  };

  const handleCheckin = async (habitId: number) => {
    try {
      await checkinHabit(habitId);
      // checkinHabit 内部已实现乐观更新，通常不需要再次刷新 habits
      // refreshHabits(); 
    } catch (err) {
      alert(err instanceof Error ? err.message : "打卡失败");
    }
  };

  // AI智能规划发送消息
  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput.trim(),
      planData: null // 用户消息没有 planData
    };

    // 先将用户消息添加到状态中，提供即时反馈
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setAiLoading(true);

    try {
      // ✅ 修改：只发送最新的用户消息给后端
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [ // 只发送最新的用户消息
            {
              role: 'user',
              content: userMessage.content
            }
          ],
          // purpose: 'planning' // purpose 字段已不再需要
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
        planData: data.plan || null, // ✅ 将后端返回的 plan 存储到 planData
      };

      // 将 AI 的回复也添加到状态中
      setAiMessages(prev => [...prev, aiMessage]);

      // 如果 AI 返回了计划 (data.plan)，可以在这里处理，例如添加到目标列表
      // (现在在渲染时通过按钮调用 addTasksFromAIReply 来处理)
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，出了点问题，请稍后再试。',
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

  // 从AI回复中解析任务并添加 (根据后端返回的 plan 格式)
  const addTasksFromAIReply = async (plan: { daily: { title: string, description: string }[], future: { title: string, description: string }[] }) => {
    const { daily, future } = plan;
    
    // 获取当前用户信息
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert("请先登录");
      return;
    }

    // 添加 Daily 任务
    for (const task of daily) {
      const { title, description } = task;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title,
        description,
        type: "今日待办", // 映射到 "今日待办"
        priority: "中",
      });

      if (error) {
        console.error("添加今日待办失败:", error);
        alert(`添加任务 "${title}" 失败，请重试`);
        return; // 遇到错误时停止
      }
    }

    // 添加 Future 任务
    for (const task of future) {
      const { title, description } = task;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title,
        description,
        type: "近期目标", // 映射到 "近期目标"
        priority: "中",
      });

      if (error) {
        console.error("添加近期目标失败:", error);
        alert(`添加目标 "${title}" 失败，请重试`);
        return; // 遇到错误时停止
      }
    }
    
    alert(`成功添加 ${daily.length + future.length} 个任务/目标！`);
    refreshGoals(); // 刷新目标列表
  };


  if (loading.goals || loading.habits) return <div className="text-center py-8">目标加载中...</div>;

  // 在渲染前打印当前状态，用于调试
  console.log("--- [Page RENDER DEBUG] 当前渲染状态 ---");
  console.log("Active Tab:", activeTab);
  console.log("Goals Today Count:", goalsToday.length);
  console.log("Goals Recent Count:", goalsRecent.length);
  console.log("Goals Array:", goals);
  console.log("------------------------------------");

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/70 via-white/70 to-orange-100/70 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-md">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">我的目标</h2>
              <p className="text-gray-500 mt-1">规划未来，成就更好的自己</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => setIsAIPlanningOpen(true)}
              >
                AI智能规划
              </Button>
              <Button onClick={() => activeTab === "我的习惯" ? setIsHabitModalOpen(true) : setIsGoalModalOpen(true)}>
                + 新建{activeTab === "我的习惯" ? "习惯" : "目标"}
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
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 - 直接撑开页面，使用浏览器滚动 */}
      <div className="flex-1">
        <div className="p-4 pt-0"> {/* 移除顶部padding，因为头部已固定 */}
          <div className="max-w-6xl mx-auto">
            <div>
              {activeTab === "今日待办" && (
                <div className="space-y-4">
                  {goalsToday.map(goal => (
                    <Card key={goal.id} className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-bold">{goal.title}</h4>
                          <p className="text-sm text-gray-500">{goal.description}</p>
                        </div>
                        <div className="flex space-x-3 text-gray-400">
                          {/* 将 ArrowUpDown 图标包装在 button 中以使其可点击 */}
                          <button
                            type="button"
                            className="cursor-pointer hover:text-orange-400 focus:outline-none"
                            onClick={() => handleMoveGoal(goal.id, goal.type)} // 将 onClick 添加到 button 上
                          >
                            <ArrowUpDown size={18} />
                          </button>
                          <Trash2 
                            size={18} 
                            className="cursor-pointer hover:text-orange-400" 
                            onClick={() => {
                              setSelectedItem({ type: 'goal', id: goal.id });
                              setShowConfirm(true);
                            }} 
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {activeTab === "近期目标" && (
                <div className="space-y-4">
                  {goalsRecent.map(goal => (
                    <Card key={goal.id} className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-4 rounded-3xl shadow-lg border border-orange-200">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-bold">{goal.title}</h4>
                          <p className="text-sm text-gray-500">{goal.description}</p>
                        </div>
                        <div className="flex space-x-3 text-gray-400">
                          {/* 将 ArrowUpDown 图标包装在 button 中以使其可点击 */}
                          <button
                            type="button"
                            className="cursor-pointer hover:text-orange-400 focus:outline-none"
                            onClick={() => handleMoveGoal(goal.id, goal.type)} // 将 onClick 添加到 button 上
                          >
                            <ArrowUpDown size={18} />
                          </button>
                          <Trash2 
                            size={18} 
                            className="cursor-pointer hover:text-orange-400" 
                            onClick={() => {
                              setSelectedItem({ type: 'goal', id: goal.id });
                              setShowConfirm(true);
                            }} 
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {activeTab === "我的习惯" && (
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
                                  {habit.frequency}
                                </span>
                                <Trash2 
                                  size={18} 
                                  className="cursor-pointer hover:text-orange-400" 
                                  onClick={() => {
                                    setSelectedItem({ type: 'habit', id: habit.id });
                                    setShowConfirm(true);
                                  }} 
                                />
                              </div>
                            </div>
                            <p className="text-gray-500 mb-3">{habit.description}</p>
                            <div className="flex items-center text-green-600">
                              <span className="ml-2 text-sm">已打卡 {habit.checkin_count || 0} 次</span>
                              {daysSince !== null && (
                                <span className="ml-3 text-sm text-gray-500">上次打卡 {daysSince} 天前</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {isToday ? (
                              <Button
                                variant="primary"
                                className="px-6 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                              >
                                已打卡
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleCheckin(habit.id)}
                                className="px-6 py-2 text-sm rounded-lg bg-black text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white"
                              >
                                打卡
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
                <h3 className="text-xl font-bold text-gray-800">AI智能规划</h3>
                <button 
                  onClick={() => {
                    setIsAIPlanningOpen(false);
                    setAiMessages([
                      {
                        id: '1',
                        role: 'assistant',
                        content: '你好！我是你的AI规划助手。请告诉我你想完成什么目标，我会帮你拆解成可执行的任务列表。🎯',
                        planData: null
                      }
                    ]);
                  }}
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
                    {/* 渲染AI的纯文本回复 */}
                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>

                    {/* ✅ 新增：如果存在 planData，则渲染结构化的计划内容 */}
                    {message.planData && (
                      <div className="mt-3 p-3 bg-white/30 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">📋 AI生成的计划：</h4>
                        
                        {/* 今日待办 */}
                        {message.planData.daily && message.planData.daily.length > 0 && (
                          <div className="mb-3">
                            <h5 className="font-medium text-xs text-gray-600 mb-1">今日待办 ({message.planData.daily.length})</h5>
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

                        {/* 近期目标 */}
                        {message.planData.future && message.planData.future.length > 0 && (
                          <div>
                            <h5 className="font-medium text-xs text-gray-600 mb-1">近期目标 ({message.planData.future.length})</h5>
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

                    {/* ✅ 修改：按钮现在直接使用 message.planData */}
                    {message.planData && (
                      <button
                        onClick={() => addTasksFromAIReply(message.planData)}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                      >
                        一键添加到目标
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="mb-4 text-left">
                  <div className="bg-gradient-to-r from-orange-200 to-yellow-100 p-4 rounded-xl max-w-full">
                    <p className="text-gray-800">AI正在思考中...</p>
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
                  placeholder="输入你想完成的事情..."
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
      />

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSuccess={refreshHabits}
      />

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-center">
              确认删除这条{selectedItem?.type === 'goal' ? '目标' : '习惯'}吗？
            </h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              删除后无法恢复。
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedItem(null);
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDelete}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}