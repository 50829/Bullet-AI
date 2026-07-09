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
import { useWorkspaceData } from "../../workspace/data";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useToast } from "../../../shared/components/ui/Toast";
import {
  useRecentDashboardRecords,
  type RecentDashboardItem,
} from "./useRecentDashboardRecords";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export type { RecentDashboardItem };

export function useTodayDashboard() {
  const router = useRouter();
  const {
    session: { userId, syncStatus, retrySync },
    moments: { moments, addMoment, updateMoment },
    reflections: { reflections, addReflection, updateReflection },
    goals: { goals, loading: goalsLoading, addGoal, updateGoal, deleteGoal },
    habits: habitsState,
  } = useWorkspaceData();
  const { habits } = habitsState;
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const recentRecords = useRecentDashboardRecords({
    userId,
    language,
    newMomentLabel: t("newMoment") || "记录",
    fallbackMoments: moments,
    fallbackReflections: reflections,
  });
  const completedGoalRetention = useCompletedGoalRetention();
  const today = todayKey();
  const todayGoals = useMemo(
    () => goals.filter((goal) => goal.due_date === today),
    [goals, today],
  );
  const openTodayGoals = todayGoals.filter(
    (goal) => goal.status !== "completed",
  );
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
      const completed = isGoalCompleted(goal);
      await updateGoal(goal.id, {
        status: completed ? "pending" : "completed",
        progress: completed ? 0 : 100,
      });
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
    await habitsState.removeHabit(habit.id);
  };

  const deleteTodayGoal = async (goal: Goal) => {
    await deleteGoal(goal.id, goal.image_path);
  };

  return {
    ...habitsState,
    goals,
    goalsLoading,
    addGoal,
    updateGoal,
    addMoment,
    updateMoment,
    addReflection,
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
  };
}
