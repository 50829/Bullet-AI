"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { GoalRecord as Goal } from "../../goals/types";
import type { HabitView } from "../../habits/types";
import {
  isGoalCompleted,
  shouldShowGoal,
  sortGoalsByCompletion,
  sortGoalsByOrder,
} from "../../goals/goalVisibility";
import { useCompletedGoalRetention } from "../../goals/hooks/useCompletedGoalRetention";
import {
  useWorkspaceGoals,
  useWorkspaceHabits,
  useWorkspaceMoments,
  useWorkspaceReflections,
} from "../../workspace/data";
import { useWorkspaceSessionContext } from "../../workspace/WorkspaceContext";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useToast } from "../../../shared/components/ui/Toast";
import { toDateKey } from "../../../lib/date/dateUtils";
import { useDeferredHardDelete } from "../../workspace/hooks/useDeferredHardDelete";
import {
  useRecentDashboardRecords,
  type RecentDashboardItem,
} from "./useRecentDashboardRecords";

export type { RecentDashboardItem };

export function useTodayDashboard() {
  const router = useRouter();
  const { syncStatus, retrySync } = useWorkspaceSessionContext();
  const { moments, createMoment, updateMoment } = useWorkspaceMoments();
  const { reflections, createReflection, updateReflection } =
    useWorkspaceReflections();
  const {
    goals,
    loading: goalsLoading,
    error: goalsError,
    createGoal,
    updateGoal,
    toggleGoalCompleted: toggleGoalCompletedCommand,
    deleteGoal,
  } = useWorkspaceGoals();
  const habitsState = useWorkspaceHabits();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const deferredDelete = useDeferredHardDelete<{
    type: "goal" | "habit";
    id: string;
    name: string;
  }>({
    onError: (error) => {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("deleteFailed") || "删除失败，请稍后重试",
      });
    },
  });
  const visibleGoals = useMemo(
    () =>
      goals.filter(
        (goal) =>
          deferredDelete.pendingDelete?.type !== "goal" ||
          goal.clientId !== deferredDelete.pendingDelete.id,
      ),
    [deferredDelete.pendingDelete, goals],
  );
  const habits = useMemo(
    () =>
      habitsState.habits.filter(
        (habit) =>
          deferredDelete.pendingDelete?.type !== "habit" ||
          habit.clientId !== deferredDelete.pendingDelete.id,
      ),
    [deferredDelete.pendingDelete, habitsState.habits],
  );
  const recentRecords = useRecentDashboardRecords({
    language,
    newMomentLabel: t("newMoment") || "记录",
    moments,
    reflections,
  });
  const completedGoalRetention = useCompletedGoalRetention();
  const today = toDateKey();
  const todayGoals = useMemo(
    () => visibleGoals.filter((goal) => goal.dueDate === today),
    [today, visibleGoals],
  );
  const openTodayGoals = todayGoals.filter((goal) => !isGoalCompleted(goal));
  const visibleTodayGoals = useMemo(
    () =>
      sortGoalsByCompletion(
        sortGoalsByOrder(
          todayGoals.filter((goal) =>
            shouldShowGoal(goal, completedGoalRetention),
          ),
        ),
      ),
    [completedGoalRetention, todayGoals],
  );
  const todayHabits = habits.slice(0, 5);
  const openRecentItem = (item: RecentDashboardItem) => {
    if (item.kind === "moment") router.push(`/moments?moment=${item.itemId}`);
    else router.push(`/reflections?reflection=${item.itemId}`);
  };

  const toggleGoalCompleted = async (goal: Goal) => {
    try {
      await toggleGoalCompletedCommand(goal);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("updateFailed") || "更新失败",
      });
    }
  };

  const deleteHabit = async (habit: HabitView) => {
    deferredDelete.scheduleDelete(
      { type: "habit", id: habit.clientId, name: habit.name },
      () => habitsState.deleteHabit(habit.clientId),
    );
  };

  const deleteTodayGoal = async (goal: Goal) => {
    deferredDelete.scheduleDelete(
      { type: "goal", id: goal.clientId, name: goal.title },
      () => deleteGoal(goal.clientId),
    );
  };

  return {
    ...habitsState,
    goals: visibleGoals,
    goalsLoading,
    goalsError,
    createGoal,
    updateGoal,
    createMoment,
    updateMoment,
    createReflection,
    updateReflection,
    syncStatus,
    retrySync,
    todayGoals,
    openTodayGoals,
    visibleTodayGoals,
    todayHabits,
    recentItems: recentRecords.items,
    recentItemsLoading: recentRecords.loading,
    openRecentItem,
    toggleGoalCompleted,
    deleteHabit,
    deleteTodayGoal,
    deferredDelete,
  };
}
