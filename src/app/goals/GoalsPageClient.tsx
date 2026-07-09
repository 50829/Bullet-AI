"use client";

import dynamic from "next/dynamic";
import { ConfirmDialog } from "../../shared/components/ui/ConfirmDialog";
import { LoadingState } from "../../shared/components/ui/LoadingState";
import { GoalPlanningBoard } from "../../features/goals/planning/GoalPlanningBoard";
import { HabitsSection } from "./components/HabitsSection";
import { useGoalsPageController } from "./hooks/useGoalsPageController";

const AssistantDrawer = dynamic(
  () =>
    import("../../features/ai/components/AssistantDrawer").then(
      (mod) => mod.AssistantDrawer,
    ),
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

export default function GoalsPageClient() {
  const page = useGoalsPageController();
  const {
    t,
    language,
    goalPage,
    assistantPanel,
    deleteConfirm,
    goalModal,
    habitModal,
    habitsSection,
  } = page;

  if (page.isInitialLoading) {
    return page.isNavigationLoading ? null : (
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
              onEditGoal={goalModal.openEdit}
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
              habits={habitsSection.habits}
              loading={
                habitsSection.loading && habitsSection.habits.length === 0
              }
              error={habitsSection.error}
              onCreateClick={habitModal.openCreate}
              onCheckinToday={habitsSection.checkinToday}
              onToggleCheckin={habitsSection.toggleCheckin}
              onEdit={habitModal.openEdit}
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

      {goalModal.isOpen && (
        <GoalModal
          isOpen
          initialGoal={goalModal.editingGoal}
          onClose={goalModal.close}
          onSuccess={() => undefined}
          onCreate={goalPage.createGoal}
          onUpdate={goalPage.updateGoal}
        />
      )}

      {habitModal.isOpen && (
        <HabitFormDialog
          isOpen
          saving={habitsSection.saving}
          habit={habitModal.editingHabit}
          onClose={habitModal.close}
          onCreate={habitsSection.createHabit}
          onUpdate={habitsSection.updateHabit}
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
          onConfirm={page.handleDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}
    </div>
  );
}
