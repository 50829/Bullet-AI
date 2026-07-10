"use client";

import dynamic from "next/dynamic";
import { ConfirmDialog } from "../../shared/components/ui/ConfirmDialog";
import { LoadingState } from "../../shared/components/ui/LoadingState";
import { GoalPlanningBoard } from "../../features/goals/planning/GoalPlanningBoard";
import { HabitsSection } from "./components/HabitsSection";
import { useGoalsPageController } from "./hooks/useGoalsPageController";
import { UndoDeleteNotice } from "../../features/workspace/components/UndoDeleteNotice";

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
    return <LoadingState className="min-h-[50dvh]" />;
  }

  return (
    <div className="flex min-h-full flex-col">
      {assistantPanel.shouldRender && (
        <AssistantDrawer
          isOpen={assistantPanel.isOpen}
          onClose={assistantPanel.close}
          title={language === "en" ? "Goal planner" : "目标拆解"}
          placeholder={t("aiGoalInputPlaceholder") || "输入你想完成的大目标..."}
          onAddGoals={goalPage.addTasksFromAIReply}
        />
      )}

      <div className="flex-1">
        <div className="px-0 pb-4">
          <div className="mx-auto max-w-6xl">
            {goalPage.error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {goalPage.error}
              </p>
            )}
            <GoalPlanningBoard
              allGoals={goalPage.goals}
              selectedDate={goalPage.selectedDate}
              rightViewMode={goalPage.rightViewMode}
              unscheduledGoals={goalPage.unscheduledGoals}
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
                  id: goal.clientId,
                  name: goal.title,
                })
              }
              onScheduleGoal={goalPage.scheduleGoalForSelectedDate}
              onMoveGoalToUnscheduled={goalPage.moveGoalToUnscheduled}
            />

            <HabitsSection
              title={t("myHabits") || "我的习惯"}
              newLabel={`${t("new")} ${t("habit")}`}
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
                  id: habit.clientId,
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
          description={
            language === "en"
              ? "You can undo this action for 5 seconds."
              : "删除后 5 秒内可以撤销。"
          }
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          loading={deleteConfirm.loading}
          tone="danger"
          onConfirm={page.handleDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}
      {page.deferredDelete.pendingDelete && (
        <UndoDeleteNotice
          itemName={page.deferredDelete.pendingDelete.name}
          onUndo={page.deferredDelete.undoDelete}
        />
      )}
    </div>
  );
}
