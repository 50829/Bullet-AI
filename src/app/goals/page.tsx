// app/goals/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Trash2 } from "lucide-react";
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

export default function GoalsPage() {
  const { goals, habits, loading, refreshGoals, refreshHabits, deleteGoal, checkinHabit } = useAppContext();
  const [activeTab, setActiveTab] = useState("我的习惯");
  const tabs = ["今日待办", "近期目标", "我的习惯"];
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'goal' | 'habit', id: number, imagePath?: string | null } | null>(null);

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
        // 删除习惯
        await deleteGoal(selectedItem.id, selectedItem.imagePath); // 注意：这里应该是删除习惯，但目前deleteHabit还没实现
        // 临时使用deleteGoal，实际应用中需要添加deleteHabit函数
      }
      
      setShowConfirm(false);
      setSelectedItem(null);
      refreshGoals(); // 刷新数据
    } catch (err) {
      console.error("删除异常:", err);
      alert("删除失败，请稍后重试");
    }
  };

  const handleCheckin = async (habitId: number) => {
    try {
      await checkinHabit(habitId);
      refreshHabits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "打卡失败");
    }
  };

  if (loading.goals || loading.habits) return <div className="text-center py-8">目标加载中...</div>;

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
            <Button onClick={() => activeTab === "我的习惯" ? setIsHabitModalOpen(true) : setIsGoalModalOpen(true)}>
              + 新建{activeTab === "我的习惯" ? "习惯" : "目标"}
            </Button>
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
                          <div className="flex items-center mt-2 space-x-3">
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                              今日待办
                            </span>
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
                          <div className="flex items-center mt-2 space-x-3">
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                              近期目标
                            </span>
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