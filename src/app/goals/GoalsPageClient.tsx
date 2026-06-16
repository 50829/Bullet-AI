// app/goals/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Trash2, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { GoalModal } from "../components/GoalModal";
import { Calendar } from "../components/Calendar";
import { AIGoalPlanningPanel } from "../components/AIGoalPlanningPanel";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext';
import { useTopBar } from '../components/layout/TopBar';
import { useHabits } from "../../features/habits/hooks/useHabits";
import { HabitList } from "../../features/habits/components/HabitList";
import { HabitFormDialog } from "../../features/habits/components/HabitFormDialog";
import { addGoalPlanToMigrationList } from "../../features/goals/services/goalService";
import type { GoalPlan } from "../../features/goals/types";

export default function GoalsPageClient() {
  const { goals, loading, refreshGoals, deleteGoal, updateGoal } = useAppContext();
  const {
    habits,
    loading: habitsLoading,
    saving: habitsSaving,
    error: habitsError,
    createHabit,
    removeHabit,
    checkinToday,
    toggleCheckin,
  } = useHabits();
  const { t, language } = useLanguage();
  const { setTopBarHandlers } = useTopBar();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [rightViewMode, setRightViewMode] = useState<"migration" | "schedule">("migration");

  // 检测屏幕尺寸
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
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
  
  // 获取待分配任务（无日期的目标）
  const migrationListGoals = goals.filter(g => !g.due_date);

  const handleDelete = async () => {
    if (!selectedItem) return;
    const itemToDelete = selectedItem;

    // 立即关闭确认面板和清除选中项（关键修复）
    setShowConfirm(false);
    setSelectedItem(null);

    try {
      if (itemToDelete.type === 'goal') {
        // 从全局状态中删除目标
        await deleteGoal(itemToDelete.id, itemToDelete.imagePath);
      } else {
        // 删除习惯
        await removeHabit(itemToDelete.id);
      }
    } catch (err) {
      console.error("删除异常:", err);
      alert(t("deleteFailed") || "删除失败，请稍后重试");
      // 如果删除失败，重新刷新数据以确保状态同步
      if (itemToDelete.type === 'goal') {
        refreshGoals();
      }
    }
  };

  // 从AI回复中解析任务并添加到迁移列表（不设置日期）
  const addTasksFromAIReply = async (plan: GoalPlan) => {
    await addGoalPlanToMigrationList(plan);
    await refreshGoals();
  };


  // 注册 TopBar 回调
  useEffect(() => {
    setTopBarHandlers({
      onAddGoal: () => setIsGoalModalOpen(true),
      onToggleAIPanel: () => setShowAIPanel(!showAIPanel),
      showAIPanel,
    });
  }, [setTopBarHandlers, showAIPanel]);

  if (loading.goals || habitsLoading) return <div className="text-center py-8">{t("loadingGoals") || "目标加载中..."}</div>;

  return (
    <div className="min-h-screen flex flex-col">

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
      <div 
        className="flex-1 transition-all duration-300"
        style={showAIPanel && isDesktop ? { transform: 'translateX(-300px)' } : {}}
      >
        <div className="p-4 pt-0">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧日历 */}
              <div className="lg:h-[520px]">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  goals={goals}
                />
              </div>
              
              {/* 右侧目标列表 */}
              <div className="lg:h-[520px]">
                <Card className="bg-theme-card rounded-[28px] relative lg:h-full flex flex-col min-h-[400px]" style={{ backgroundColor: 'var(--color-task-panel-card, var(--color-bg-card))', border: 'none' }}>
                  {/* 标题和切换按钮 */}
                  <div className="mb-4 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-2xl font-semibold text-theme-primary">
                      {rightViewMode === "migration" 
                        ? t("migrationList") || "待分配任务"
                        : selectedDate 
                          ? `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
                          : t("selectDate") || "请选择日期"}
                    </h3>
                    <button
                      onClick={() => {
                        setRightViewMode(prev => prev === "migration" ? "schedule" : "migration");
                      }}
                      className="p-2 rounded-2xl text-theme-primary hover:text-theme-primary transition-all duration-200 flex items-center gap-2"
                      style={{ 
                        backgroundColor: 'var(--color-task-panel-card, var(--color-bg-card))',
                        opacity: 0.8
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.8';
                      }}
                      title={t("switchPanel") || "切换面板"}
                    >
                      <RefreshCw size={18} />
                      <span className="text-2xl font-semibold">{t("switchPanel") || "切换面板"}</span>
                    </button>
                  </div>

                  {/* 待分配任务视图 */}
                  {rightViewMode === "migration" && (
                    <div className="flex-1 flex flex-col min-h-0">
                      {migrationListGoals.length === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-theme-primary text-2xl font-semibold">{t("noMigrationGoals") || "待分配任务为空，新建目标将自动添加到这里"}</p>
                        </div>
                      )}
                      <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
                        {migrationListGoals.map(goal => {
                          const isCompleted = goal.status === 'completed';
                          return (
                            <div
                              key={goal.id}
                              className={`group p-5 rounded-[28px] ${
                                isCompleted ? 'opacity-75' : ''
                              }`}
                              style={{ 
                                backgroundColor: 'var(--color-modal-card, #efeeeb)',
                                border: '2px solid var(--color-task-card-border, transparent)'
                              }}
                            >
                              <div className="flex justify-between items-center gap-4">
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
                                    className="p-1.5 rounded-full bg-[#b2ff9e] hover:bg-[#b2ff9e]/80 transition-colors duration-200 flex items-center justify-center flex-shrink-0"
                                    title={t("completeGoal") || "完成目标"}
                                  >
                                    <CheckCircle2 size={18} className="text-theme-primary" />
                                  </button>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className={`font-bold text-lg ${isCompleted ? 'line-through text-[var(--color-text-primary)]/50' : 'text-[var(--color-text-primary)]'}`}>
                                      {goal.title}
                                    </h4>
                                    {isCompleted && (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                        {t("completed") || "已完成"}
                                      </span>
                                    )}
                                  </div>
                                  {goal.description && (
                                    <p className={`text-sm ${isCompleted ? 'text-[var(--color-text-primary)]/50 line-through' : 'text-[var(--color-text-primary)]'}`}>
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
                                      className="p-2 rounded-2xl bg-theme-primary hover:bg-theme-primary-hover transition-colors duration-200 flex items-center justify-center"
                                      style={{ color: 'var(--color-text-on-primary)' }}
                                      title={t("migrate") || "迁移"}
                                    >
                                      <ArrowRight size={18} />
                                    </button>
                                  )}
                                  <div 
                                    className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                    title={t("delete") || "删除"}
                                  >
                                    <Trash2 
                                      size={18} 
                                      className="hover:text-red-500 transition-colors" 
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
                              </div>
                              {!selectedDate && !isCompleted && (
                                  <p className="text-xs text-theme-primary mt-2">
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
                    <div className="flex-1 flex flex-col min-h-0 relative">
                      {selectedDateGoals.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-theme-primary text-2xl font-semibold">{t("noGoalsForDate") || "该日期暂无目标"}</p>
                        </div>
                      )}
                      <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
                        {selectedDateGoals.map(goal => {
                          const isCompleted = goal.status === 'completed';
                          return (
                            <div
                              key={goal.id}
                              className={`group p-5 rounded-[28px] ${
                                isCompleted ? 'opacity-75' : ''
                              }`}
                              style={{ 
                                backgroundColor: 'var(--color-modal-card, #efeeeb)',
                                border: '2px solid var(--color-task-card-border, transparent)'
                              }}
                            >
                              <div className="flex justify-between items-center gap-4">
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
                                    className="p-1.5 rounded-full bg-[#b2ff9e] hover:bg-[#b2ff9e]/80 transition-colors duration-200 flex items-center justify-center flex-shrink-0"
                                    title={t("completeGoal") || "完成目标"}
                                  >
                                    <CheckCircle2 size={18} className="text-theme-primary" />
                                  </button>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className={`font-bold text-lg ${isCompleted ? 'line-through text-[var(--color-text-primary)]/50' : 'text-[var(--color-text-primary)]'}`}>
                                      {goal.title}
                                    </h4>
                                    {isCompleted && (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                        {t("completed") || "已完成"}
                                      </span>
                                    )}
                                  </div>
                                  {goal.description && (
                                    <p className={`text-sm ${isCompleted ? 'text-[var(--color-text-primary)]/50 line-through' : 'text-[var(--color-text-primary)]'}`}>
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
                                      className="p-2 rounded-2xl bg-theme-primary hover:bg-theme-primary-hover transition-colors duration-200 flex items-center justify-center"
                                      style={{ color: 'var(--color-text-on-primary)' }}
                                      title={t("moveBack") || "迁回"}
                                    >
                                      <ArrowLeft size={18} />
                                    </button>
                                  )}
                                  <div 
                                    className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                    title={t("delete") || "删除"}
                                  >
                                    <Trash2 
                                      size={18} 
                                      className="hover:text-red-500 transition-colors" 
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

            {/* 我的习惯卡片 - 放在日历下方 */}
            <div className="mt-6">
              <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 rounded-3xl shadow-lg" style={{ border: 'none' }}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{t("myHabits") || "我的习惯"}</h3>
                  <Button onClick={() => setIsHabitModalOpen(true)} className="border-2 border-transparent hover:!border-gray-800">
                    + {t("new")} {t("habit")}
                  </Button>
                </div>
                {habitsError && (
                  <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{habitsError}</p>
                )}
                <HabitList
                  habits={habits}
                  loading={habitsLoading}
                  onCreateClick={() => setIsHabitModalOpen(true)}
                  onCheckinToday={checkinToday}
                  onToggleCheckin={toggleCheckin}
                  onDelete={(habit) => {
                    setSelectedItem({
                      type: 'habit',
                      id: habit.id,
                      name: habit.name,
                    });
                    setShowConfirm(true);
                  }}
                />
              </Card>
            </div>
          </div>
        </div>
      </div>


      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={refreshGoals}
      />

      <HabitFormDialog
        isOpen={isHabitModalOpen}
        saving={habitsSaving}
        onClose={() => setIsHabitModalOpen(false)}
        onCreate={createHabit}
      />

      {showConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="p-4 rounded-[28px] shadow-md max-w-sm w-full mx-4" style={{ backgroundColor: 'var(--color-modal-card, #efeeeb)' }}>
            <h2 className="text-xl font-semibold mb-4 text-center text-[var(--color-text-primary)]">
              {t("confirmDelete")} {selectedItem.name} {selectedItem.type === 'goal' ? t("goal") : t("habit")}{t("questionMark") || "吗？"}
            </h2>
            <p className="text-[var(--color-text-secondary)] text-base mb-4 text-center">
              {t("cannotRecover") || "删除后不可恢复"}
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 rounded-3xl font-semibold transition-colors border-2 border-black bg-transparent text-black hover:bg-black hover:text-[var(--color-text-inverse)] hover:border-black text-base"
              >
                {t("cancel") || "取消"}
              </button>
              <button
                className="px-4 py-2 rounded-3xl font-semibold transition-colors border-2 border-red-500 bg-transparent text-red-500 hover:bg-red-500 hover:text-[var(--color-text-inverse)] hover:border-red-500 text-base"
                onClick={handleDelete}
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
