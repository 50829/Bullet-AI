// app/goals/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { GoalModal } from "../components/GoalModal";
import { Calendar } from "../components/Calendar";
import { AssistantDrawer } from "../components/AssistantDrawer";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../context/LanguageContext';
import { useTopBar } from '../components/layout/TopBar';
import { useHabits } from "../../features/habits/hooks/useHabits";
import { HabitList } from "../../features/habits/components/HabitList";
import { HabitFormDialog } from "../../features/habits/components/HabitFormDialog";
import type { GoalPlan } from "../../features/goals/types";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useToast } from "../components/ui/Toast";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { GoalCard } from "../../features/goals/components/GoalCard";
import { SortableGoalList, SortableGoalItem } from "../../features/goals/components/SortableGoalList";
import { isGoalCompleted, shouldShowGoal, sortGoalsByCompletion, sortGoalsByOrder } from "../../features/goals/goalVisibility";
import { useCompletedGoalRetention } from "../../features/goals/hooks/useCompletedGoalRetention";

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function GoalsPageClient() {
  const { goals, loading, refreshGoals, addGoal, deleteGoal, updateGoal, reorderGoals } = useAppContext();
  const {
    habits,
    loading: habitsLoading,
    saving: habitsSaving,
    error: habitsError,
    createHabit,
    updateHabit,
    removeHabit,
    checkinToday,
    toggleCheckin,
  } = useHabits();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const completedGoalRetention = useCompletedGoalRetention();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<(typeof goals)[number] | null>(null);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<(typeof habits)[number] | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => getTodayDate());
  const [rightViewMode, setRightViewMode] = useState<"migration" | "schedule">("migration");
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ 
    type: 'goal' | 'habit', 
    id: number, 
    name: string, 
    imagePath?: string | null 
  } | null>(null);

  const selectedDateGoals = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = formatDateToLocal(selectedDate);
    return sortGoalsByCompletion(
      sortGoalsByOrder(
        goals.filter((goal) => {
          if (goal.due_date !== dateStr) return false;
          return shouldShowGoal(goal, completedGoalRetention);
        }),
      ),
    );
  }, [completedGoalRetention, goals, selectedDate]);

  const migrationListGoals = useMemo(
    () =>
      sortGoalsByCompletion(
        sortGoalsByOrder(
          goals.filter((goal) => !goal.due_date && shouldShowGoal(goal, completedGoalRetention)),
        ),
      ),
    [completedGoalRetention, goals],
  );

  const toggleGoalCompleted = async (goal: (typeof goals)[number]) => {
    try {
      const completed = isGoalCompleted(goal);
      await updateGoal(goal.id, {
        status: completed ? "pending" : "completed",
        progress: completed ? 0 : 100,
      });
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : t("updateFailed") || "更新失败",
      });
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setRightViewMode("schedule");
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const itemToDelete = selectedItem;

    setDeleting(true);

    try {
      if (itemToDelete.type === 'goal') {
        await deleteGoal(itemToDelete.id, itemToDelete.imagePath);
      } else {
        await removeHabit(itemToDelete.id);
      }
      setShowConfirm(false);
      setSelectedItem(null);
    } catch (err) {
      console.error("删除异常:", err);
      showToast({ type: "error", message: t("deleteFailed") || "删除失败，请稍后重试" });
      if (itemToDelete.type === 'goal') {
        void refreshGoals();
      }
    } finally {
      setDeleting(false);
    }
  };

  const addTasksFromAIReply = async (plan: GoalPlan) => {
    [...plan.daily, ...plan.future].forEach((task) => {
      addGoal({
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: task.title,
        description: task.description,
        due_date: null,
        status: "pending",
        progress: 0,
        image_url: null,
        image_path: null,
        created_at: new Date().toISOString(),
      });
    });
  };

  useEffect(() => {
    setTopBarHandlers({
      onAddGoal: () => {
        setEditingGoal(null);
        setIsGoalModalOpen(true);
      },
      onToggleAIPanel: () => setShowAIPanel((current) => !current),
    });
  }, [setTopBarHandlers]);

  const isInitialLoading = (loading.goals && goals.length === 0) || (habitsLoading && habits.length === 0);

  if (isInitialLoading) return <LoadingState />;

  return (
    <div className="flex min-h-full flex-col">

      <AssistantDrawer
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        mode="planning"
        title={language === "en" ? "Planning" : "规划"}
        placeholder={t("aiGoalInputPlaceholder") || "输入你想完成的大目标..."}
        systemPrompt={
          language === "en"
            ? "You are the user's planning partner, focused on breaking down large goals into actionable sub-goals. Please strictly follow these rules:\n" +
              "1. Your responses must be clear, actionable, and structured, using the same language as the user. Please respond in English.\n" +
              "2. When users share a large goal, break it down into multiple smaller, executable sub-goals.\n" +
              "3. You must provide a structured plan in JSON format with 'tasksDaily' and 'tasksFuture' arrays.\n" +
              "4. 'tasksDaily' should contain immediate actionable tasks, 'tasksFuture' should contain medium-term sub-goals.\n" +
              "5. Each task should have a clear title (≤30 characters) and description.\n" +
              "6. Always generate the JSON plan when users express planning intentions."
            : "你是用户的规划伙伴，专注于将大目标拆分成可执行的小目标。请严格遵守以下规则：\n" +
              "1. 回答必须清晰、可执行、结构化，且使用与用户相同的语言。请使用中文回复。\n" +
              "2. 当用户分享大目标时，将其拆解成多个可执行的小目标。\n" +
              "3. 必须提供结构化的计划，使用 JSON 格式，包含 'tasksDaily' 和 'tasksFuture' 两个数组。\n" +
              "4. 'tasksDaily' 应包含立即可执行的任务，'tasksFuture' 应包含中期的小目标。\n" +
              "5. 每个任务应有清晰的标题（≤30字符）和描述。\n" +
              "6. 当用户表达规划意图时，必须生成 JSON 计划。"
        }
        onAddGoals={addTasksFromAIReply}
      />

      <div className="flex-1">
        <div className="px-0 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:h-[520px]">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  goals={goals}
                />
              </div>
              
              <div className="lg:h-[min(520px,calc(100dvh-6rem))]">
                <Card className="relative flex min-h-[400px] flex-col rounded-xl p-5 lg:h-full" style={{ backgroundColor: 'var(--color-task-panel-card, var(--color-bg-card))' }}>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
                    <h3 className="text-2xl font-semibold text-theme-primary">
                      {rightViewMode === "migration" 
                        ? t("migrationList") || "待分配任务"
                        : selectedDate 
                          ? `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
                          : t("selectDate") || "请选择日期"}
                    </h3>
                    <div className="inline-flex rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-1">
                      {(["migration", "schedule"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setRightViewMode(mode)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${
                            rightViewMode === mode
                              ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
                          }`}
                        >
                          {mode === "migration" ? t("migrationList") || "待分配任务" : t("schedulePlanning") || "日程规划"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {rightViewMode === "migration" && (
                    <div className="flex-1 flex flex-col min-h-0">
                      {migrationListGoals.length === 0 && (
                        <EmptyState title={language === "en" ? "No tasks" : "暂无任务"} />
                      )}
                      <div className="min-h-0 flex-1 divide-y divide-[var(--color-border-muted)] overflow-y-auto">
                        <SortableGoalList
                          ids={migrationListGoals.map((goal) => goal.id)}
                          onReorder={(orderedIds) => void reorderGoals(orderedIds)}
                        >
                          {migrationListGoals.map((goal) => (
                            <SortableGoalItem key={goal.id} id={goal.id}>
                              <GoalCard
                                goal={goal}
                                variant="list"
                                onComplete={() => toggleGoalCompleted(goal)}
                                onEdit={() => {
                                  setEditingGoal(goal);
                                  setIsGoalModalOpen(true);
                                }}
                                onDelete={() => {
                                  setSelectedItem({
                                    type: "goal",
                                    id: goal.id,
                                    name: goal.title,
                                    imagePath: goal.image_path,
                                  });
                                  setShowConfirm(true);
                                }}
                                moveAction={
                                  selectedDate
                                    ? {
                                        direction: "forward",
                                        label: t("migrate") || "迁移",
                                        onClick: async () => {
                                          try {
                                            const dateStr = formatDateToLocal(selectedDate);
                                            await updateGoal(goal.id, { due_date: dateStr });
                                            setRightViewMode("schedule");
                                          } catch (err) {
                                            showToast({
                                              type: "error",
                                              message: err instanceof Error ? err.message : t("migrateFailed") || "迁移失败",
                                            });
                                          }
                                        },
                                      }
                                    : undefined
                                }
                              />
                            </SortableGoalItem>
                          ))}
                        </SortableGoalList>
                      </div>
                    </div>
                  )}

                  {rightViewMode === "schedule" && (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                      {selectedDateGoals.length === 0 && (
                        <EmptyState title={language === "en" ? "No goals" : "暂无目标"} />
                      )}
                      <div className="min-h-0 flex-1 divide-y divide-[var(--color-border-muted)] overflow-y-auto">
                        <SortableGoalList
                          ids={selectedDateGoals.map((goal) => goal.id)}
                          onReorder={(orderedIds) => void reorderGoals(orderedIds)}
                        >
                          {selectedDateGoals.map((goal) => (
                            <SortableGoalItem key={goal.id} id={goal.id}>
                              <GoalCard
                                goal={goal}
                                variant="list"
                                onComplete={() => toggleGoalCompleted(goal)}
                                onEdit={() => {
                                  setEditingGoal(goal);
                                  setIsGoalModalOpen(true);
                                }}
                                onDelete={() => {
                                  setSelectedItem({
                                    type: "goal",
                                    id: goal.id,
                                    name: goal.title,
                                    imagePath: goal.image_path,
                                  });
                                  setShowConfirm(true);
                                }}
                                moveAction={{
                                  direction: "back",
                                  label: t("moveBack") || "迁回",
                                  onClick: async () => {
                                    try {
                                      await updateGoal(goal.id, { due_date: null });
                                      setRightViewMode("migration");
                                    } catch (err) {
                                      showToast({
                                        type: "error",
                                        message: err instanceof Error ? err.message : t("moveBackFailed") || "迁回失败",
                                      });
                                    }
                                  },
                                }}
                              />
                            </SortableGoalItem>
                          ))}
                        </SortableGoalList>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            <div className="mt-6">
              <Card className="rounded-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{t("myHabits") || "我的习惯"}</h3>
                  <Button onClick={() => setIsHabitModalOpen(true)} variant="outline">
                    + {t("new")} {t("habit")}
                  </Button>
                </div>
                {habitsError && (
                  <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{habitsError}</p>
                )}
                <HabitList
                  habits={habits}
                  loading={habitsLoading && habits.length === 0}
                  onCreateClick={() => setIsHabitModalOpen(true)}
                  onCheckinToday={checkinToday}
                  onToggleCheckin={toggleCheckin}
                  onEdit={(habit) => {
                    setEditingHabit(habit);
                    setIsHabitModalOpen(true);
                  }}
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
        initialGoal={editingGoal}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSuccess={() => undefined}
      />

      <HabitFormDialog
        isOpen={isHabitModalOpen}
        saving={habitsSaving}
        habit={editingHabit}
        onClose={() => {
          setIsHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onCreate={createHabit}
        onUpdate={updateHabit}
      />

      <ConfirmDialog
        isOpen={showConfirm && Boolean(selectedItem)}
        title={`${t("confirmDelete") || "确认删除"} ${selectedItem?.name ?? ""}`}
        description={t("cannotRecover") || "删除后不可恢复"}
        confirmLabel={t("confirm") || "确认"}
        cancelLabel={t("cancel") || "取消"}
        loading={deleting}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirm(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
