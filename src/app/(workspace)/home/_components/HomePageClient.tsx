"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { HabitView } from "@/features/habits/types";
import type { GoalRecord as Goal } from "@/features/goals/types";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { useDeleteConfirm } from "@/app/(workspace)/_hooks/useDeleteConfirm";
import { RecentRecordsSection } from "./RecentRecordsSection";
import { TodayGoalsSection } from "./TodayGoalsSection";
import { TodayHabitsSection } from "./TodayHabitsSection";
import { TodayHeader } from "./TodayHeader";
import { useTodayDashboard } from "@/features/today/hooks/useTodayDashboard";
import { UndoDeleteNotice } from "@/features/workspace/components/UndoDeleteNotice";

const GoalModal = dynamic(
  () =>
    import("@/features/goals/components/GoalModal").then(
      (mod) => mod.GoalModal,
    ),
  { ssr: false },
);
const HabitFormDialog = dynamic(
  () =>
    import("@/features/habits/components/HabitFormDialog").then(
      (mod) => mod.HabitFormDialog,
    ),
  { ssr: false },
);
const MomentModal = dynamic(
  () =>
    import("@/features/moments/components/MomentModal").then(
      (mod) => mod.MomentModal,
    ),
  { ssr: false },
);
const ReflectionModal = dynamic(
  () =>
    import("@/features/reflections/components/ReflectionModal").then(
      (mod) => mod.ReflectionModal,
    ),
  { ssr: false },
);

type DeleteTarget =
  | { type: "goal"; id: string; name: string; goal: Goal }
  | { type: "habit"; id: string; name: string; habit: HabitView };

export default function HomePage() {
  const today = useTodayDashboard();
  const { t, language } = useLanguage();
  const [momentOpen, setMomentOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitView | null>(null);
  const deleteConfirm = useDeleteConfirm<DeleteTarget>();

  const handleDelete = async () => {
    await deleteConfirm.confirm(async (target) => {
      if (target.type === "goal") {
        await today.deleteTodayGoal(target.goal);
        return;
      }
      await today.deleteHabit(target.habit);
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <TodayHeader
        syncStatus={today.syncStatus}
        onRetrySync={today.retrySync}
        onNewMoment={() => setMomentOpen(true)}
        onNewGoal={() => setGoalOpen(true)}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <TodayGoalsSection
          goals={today.visibleTodayGoals}
          loading={today.goalsLoading && today.goals.length === 0}
          error={today.goalsError}
          remainingCount={today.openTodayGoals.length}
          onCreate={() => setGoalOpen(true)}
          onComplete={today.toggleGoalCompleted}
          onEdit={(goal) => {
            setEditingGoal(goal);
            setGoalOpen(true);
          }}
          onDelete={(goal) =>
            deleteConfirm.open({
              type: "goal",
              id: goal.clientId,
              name: goal.title,
              goal,
            })
          }
        />

        <TodayHabitsSection
          habits={today.todayHabits}
          allHabits={today.habits}
          loading={today.loading && today.todayHabits.length === 0}
          error={today.error}
          onCreate={() => setHabitOpen(true)}
          onCheckinToday={today.checkinToday}
          onToggleCheckin={today.toggleCheckin}
          onEdit={(habit) => {
            setEditingHabit(habit);
            setHabitOpen(true);
          }}
          onDelete={(habit) =>
            deleteConfirm.open({
              type: "habit",
              id: habit.clientId,
              name: habit.name,
              habit,
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentRecordsSection
          items={today.recentItems}
          loading={today.recentItemsLoading}
          onOpen={today.openRecentItem}
          onNewMoment={() => setMomentOpen(true)}
          onNewReflection={() => setReflectionOpen(true)}
        />
      </div>

      {momentOpen && (
        <MomentModal
          isOpen
          onClose={() => setMomentOpen(false)}
          onCreate={today.createMoment}
          onUpdate={today.updateMoment}
        />
      )}
      {goalOpen && (
        <GoalModal
          isOpen={goalOpen}
          initialGoal={editingGoal}
          onClose={() => {
            setGoalOpen(false);
            setEditingGoal(null);
          }}
          onCreate={today.createGoal}
          onUpdate={today.updateGoal}
        />
      )}
      {reflectionOpen && (
        <ReflectionModal
          isOpen
          onClose={() => setReflectionOpen(false)}
          onCreate={today.createReflection}
          onUpdate={today.updateReflection}
        />
      )}
      {habitOpen && (
        <HabitFormDialog
          isOpen
          saving={today.saving}
          habit={editingHabit}
          onClose={() => {
            setHabitOpen(false);
            setEditingHabit(null);
          }}
          onCreate={today.createHabit}
          onUpdate={today.updateHabit}
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
          tone="danger"
          loading={deleteConfirm.loading}
          onConfirm={handleDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}
      {today.deferredDelete.pendingDelete && (
        <UndoDeleteNotice
          itemName={today.deferredDelete.pendingDelete.name}
          onUndo={today.deferredDelete.undoDelete}
        />
      )}
    </div>
  );
}
