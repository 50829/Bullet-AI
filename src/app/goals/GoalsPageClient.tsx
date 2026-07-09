"use client";

import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useHabits } from "../../features/habits/hooks/useHabits";
import type { HabitView } from "../../features/habits/types";
import type { GoalRecord } from "../../features/goals/types";
import { useWorkspacePageLoading } from "../components/layout/WorkspaceNavigationContext";
import { ConfirmDialog } from "../../shared/components/ui/ConfirmDialog";
import { LoadingState } from "../../shared/components/ui/LoadingState";
import { useToast } from "../../shared/components/ui/Toast";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useAssistantPanel } from "../hooks/useAssistantPanel";
import { useDeleteConfirm } from "../hooks/useDeleteConfirm";
import { useWorkspaceSessionContext } from "../../features/workspace/WorkspaceContext";
import { GoalPlanningBoard } from "../../features/goals/planning/GoalPlanningBoard";
import { HabitsSection } from "./components/HabitsSection";
import { useGoalPlanningPage } from "../../features/goals/planning/useGoalPlanningPage";

const AssistantDrawer = dynamic(
  () =>
    import("../components/AssistantDrawer").then((mod) => mod.AssistantDrawer),
  { ssr: false },
);
const GoalModal = dynamic(
  () =>
    import("../../features/goals/components/GoalModal").then(
      (mod) => mod.GoalModal,
    ),
  { ssr: false },
);
const HabitFormDialog = dynamic(
  () =>
    import("../../features/habits/components/HabitFormDialog").then(
      (mod) => mod.HabitFormDialog,
    ),
  { ssr: false },
);

type DeleteTarget = {
  type: "goal" | "habit";
  id: number;
  name: string;
  imagePath?: string | null;
};

export default function GoalsPageClient() {
  const { userId } = useWorkspaceSessionContext();
  const goalPage = useGoalPlanningPage({ userId });
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
  } = useHabits({ userId });
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitView | null>(null);
  const deleteConfirm = useDeleteConfirm<DeleteTarget>();

  const openGoalModal = useCallback(() => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  }, []);
  const topBarHandlers = useMemo(
    () => ({
      onAddGoal: openGoalModal,
    }),
    [openGoalModal],
  );
  const assistantPanel = useAssistantPanel(topBarHandlers);

  const handleDelete = async () => {
    await deleteConfirm.confirm(async (target) => {
      try {
        if (target.type === "goal") {
          await goalPage.deleteGoal(target.id, target.imagePath);
        } else {
          await removeHabit(target.id);
        }
      } catch (err) {
        console.error("删除异常:", err);
        showToast({
          type: "error",
          message: t("deleteFailed") || "删除失败，请稍后重试",
        });
        if (target.type === "goal") void goalPage.refreshGoals();
        throw err;
      }
    });
  };

  const isInitialLoading =
    (goalPage.loading && goalPage.goals.length === 0) ||
    (habitsLoading && habits.length === 0);
  const isNavigationLoading = useWorkspacePageLoading(isInitialLoading);

  if (isInitialLoading) {
    return isNavigationLoading ? null : (
      <LoadingState className="min-h-[50dvh]" />
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {assistantPanel.shouldRender && (
        <AssistantDrawer
          isOpen={assistantPanel.isOpen}
          onClose={assistantPanel.close}
          mode="planning"
          title={language === "en" ? "Planning" : "规划"}
          placeholder={t("aiGoalInputPlaceholder") || "输入你想完成的大目标..."}
          purpose="goal_planning"
          onAddGoals={goalPage.addTasksFromAIReply}
        />
      )}

      <div className="flex-1">
        <div className="px-0 pb-4">
          <div className="mx-auto max-w-6xl">
            <GoalPlanningBoard
              allGoals={goalPage.goals}
              selectedDate={goalPage.selectedDate}
              rightViewMode={goalPage.rightViewMode}
              migrationListGoals={goalPage.migrationListGoals}
              selectedDateGoals={goalPage.selectedDateGoals}
              language={language}
              t={t}
              onDateSelect={goalPage.handleDateSelect}
              onViewModeChange={goalPage.setRightViewMode}
              onReorderGoals={(orderedIds) =>
                void goalPage.reorderGoals(orderedIds)
              }
              onCompleteGoal={goalPage.toggleGoalCompleted}
              onEditGoal={(goal) => {
                setEditingGoal(goal);
                setIsGoalModalOpen(true);
              }}
              onDeleteGoal={(goal) =>
                deleteConfirm.open({
                  type: "goal",
                  id: goal.id,
                  name: goal.title,
                  imagePath: goal.image_path,
                })
              }
              onMigrateGoal={goalPage.migrateGoalToSelectedDate}
              onMoveGoalBack={goalPage.moveGoalBack}
            />

            <HabitsSection
              title={t("myHabits") || "我的习惯"}
              newLabel={`+ ${t("new")} ${t("habit")}`}
              habits={habits}
              loading={habitsLoading && habits.length === 0}
              error={habitsError}
              onCreateClick={() => setIsHabitModalOpen(true)}
              onCheckinToday={checkinToday}
              onToggleCheckin={toggleCheckin}
              onEdit={(habit) => {
                setEditingHabit(habit);
                setIsHabitModalOpen(true);
              }}
              onDelete={(habit) =>
                deleteConfirm.open({
                  type: "habit",
                  id: habit.id,
                  name: habit.name,
                })
              }
            />
          </div>
        </div>
      </div>

      {isGoalModalOpen && (
        <GoalModal
          isOpen
          initialGoal={editingGoal}
          onClose={() => {
            setIsGoalModalOpen(false);
            setEditingGoal(null);
          }}
          onSuccess={() => undefined}
          onCreate={goalPage.addGoal}
          onUpdate={goalPage.updateGoal}
        />
      )}

      {isHabitModalOpen && (
        <HabitFormDialog
          isOpen
          saving={habitsSaving}
          habit={editingHabit}
          onClose={() => {
            setIsHabitModalOpen(false);
            setEditingHabit(null);
          }}
          onCreate={createHabit}
          onUpdate={updateHabit}
        />
      )}

      {deleteConfirm.target && (
        <ConfirmDialog
          isOpen
          title={`${t("confirmDelete") || "确认删除"} ${deleteConfirm.target.name}`}
          description={t("cannotRecover") || "删除后不可恢复"}
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          loading={deleteConfirm.loading}
          tone="danger"
          onConfirm={handleDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}
    </div>
  );
}
