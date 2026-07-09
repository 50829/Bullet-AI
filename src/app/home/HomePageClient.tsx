"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { HabitView } from "../../features/habits/types";
import type { GoalRecord as Goal } from "../../features/goals/types";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { ConfirmDialog } from "../../shared/components/ui/ConfirmDialog";
import { useDeleteConfirm } from "../hooks/useDeleteConfirm";
import { RecentRecordsSection } from "./components/RecentRecordsSection";
import { TodayGoalsSection } from "./components/TodayGoalsSection";
import { TodayHabitsSection } from "./components/TodayHabitsSection";
import { TodayHeader } from "./components/TodayHeader";
import { useTodayDashboard } from "../../features/dashboard/hooks/useTodayDashboard";

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
const MomentModal = dynamic(
  () =>
    import("../../features/moments/components/MomentModal").then(
      (mod) => mod.MomentModal,
    ),
  { ssr: false },
);
const ReflectionModal = dynamic(
  () =>
    import("../../features/reflections/components/ReflectionModal").then(
      (mod) => mod.ReflectionModal,
    ),
  { ssr: false },
);

type DeleteTarget =
  | { type: "goal"; id: number; name: string; goal: Goal }
  | { type: "habit"; id: number; name: string; habit: HabitView };

export default function HomePage() {
  const dashboard = useTodayDashboard();
  const { t } = useLanguage();
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
        await dashboard.deleteTodayGoal(target.goal);
        return;
      }
      await dashboard.deleteHabit(target.habit);
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <TodayHeader
        syncStatus={dashboard.syncStatus}
        onRetrySync={dashboard.retrySync}
        onNewMoment={() => setMomentOpen(true)}
        onNewGoal={() => setGoalOpen(true)}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <TodayGoalsSection
          goals={dashboard.visibleTodayGoals}
          loading={dashboard.goalsLoading && dashboard.goals.length === 0}
          remainingCount={dashboard.openTodayGoals.length}
          onCreate={() => setGoalOpen(true)}
          onComplete={dashboard.toggleGoalCompleted}
          onEdit={(goal) => {
            setEditingGoal(goal);
            setGoalOpen(true);
          }}
          onDelete={(goal) =>
            deleteConfirm.open({
              type: "goal",
              id: goal.id,
              name: goal.title,
              goal,
            })
          }
        />

        <TodayHabitsSection
          habits={dashboard.todayHabits}
          allHabits={dashboard.habits}
          loading={dashboard.loading && dashboard.todayHabits.length === 0}
          onCreate={() => setHabitOpen(true)}
          onCheckinToday={dashboard.checkinToday}
          onToggleCheckin={dashboard.toggleCheckin}
          onEdit={(habit) => {
            setEditingHabit(habit);
            setHabitOpen(true);
          }}
          onDelete={(habit) =>
            deleteConfirm.open({
              type: "habit",
              id: habit.id,
              name: habit.name,
              habit,
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentRecordsSection
          items={dashboard.recentItems}
          onOpen={dashboard.openRecentItem}
          onNewMoment={() => setMomentOpen(true)}
          onNewReflection={() => setReflectionOpen(true)}
        />
      </div>

      {momentOpen && (
        <MomentModal
          isOpen
          onClose={() => setMomentOpen(false)}
          onSuccess={() => undefined}
          onCreate={dashboard.addMoment}
          onUpdate={dashboard.updateMoment}
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
          onSuccess={() => undefined}
          onCreate={dashboard.addGoal}
          onUpdate={dashboard.updateGoal}
        />
      )}
      {reflectionOpen && (
        <ReflectionModal
          isOpen
          onClose={() => setReflectionOpen(false)}
          onSuccess={() => undefined}
          onCreate={dashboard.addReflection}
          onUpdate={dashboard.updateReflection}
        />
      )}
      {habitOpen && (
        <HabitFormDialog
          isOpen
          saving={dashboard.saving}
          habit={editingHabit}
          onClose={() => {
            setHabitOpen(false);
            setEditingHabit(null);
          }}
          onCreate={dashboard.createHabit}
          onUpdate={dashboard.updateHabit}
        />
      )}
      {deleteConfirm.target && (
        <ConfirmDialog
          isOpen
          title={`${t("confirmDelete") || "确认删除"} ${deleteConfirm.target.name}`}
          description={t("cannotRecover") || "删除后不可恢复。"}
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          tone="danger"
          loading={deleteConfirm.loading}
          onConfirm={handleDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}
    </div>
  );
}
