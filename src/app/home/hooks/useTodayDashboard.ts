"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHabits } from "../../../features/habits/hooks/useHabits";
import type { HabitView } from "../../../features/habits/types";
import {
  isGoalCompleted,
  shouldShowGoal,
  sortGoalsByCompletion,
  sortGoalsByOrder,
} from "../../../features/goals/goalVisibility";
import { useCompletedGoalRetention } from "../../../features/goals/hooks/useCompletedGoalRetention";
import { parseReflectionContent } from "../../../lib/reflections/reflectionContent";
import {
  useGoalsContext,
  useMomentsContext,
  useReflectionsContext,
  useWorkspaceSessionContext,
} from "../../../features/workspace/WorkspaceContext";
import type { GoalRecord as Goal } from "../../../features/workspace/types";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useToast } from "../../../shared/components/ui/Toast";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function formatRecentItemDate(value: string, language: "zh" | "en") {
  const dateKey = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return value;

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return value;

  const weekday = date.toLocaleDateString(
    language === "en" ? "en-US" : "zh-CN",
    { weekday: "short" },
  );
  return `${month}-${day} ${weekday}`;
}

export type RecentDashboardItem = {
  id: string;
  kind: "moment" | "reflection";
  itemId: number;
  title: string;
  time: string;
  dateLabel: string;
};

export function useTodayDashboard() {
  const router = useRouter();
  const { moments, addMoment, updateMoment } = useMomentsContext();
  const { reflections, addReflection, updateReflection } =
    useReflectionsContext();
  const {
    goals,
    loading: goalsLoading,
    addGoal,
    updateGoal,
    deleteGoal,
  } = useGoalsContext();
  const { syncStatus, retrySync } = useWorkspaceSessionContext();
  const habitsState = useHabits();
  const { habits } = habitsState;
  const { t, language } = useLanguage();
  const { showToast } = useToast();
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
  const recentItems = useMemo<RecentDashboardItem[]>(() => {
    const momentItems = moments.slice(0, 4).map((moment) => ({
      id: `moment-${moment.id}`,
      kind: "moment" as const,
      itemId: moment.id,
      title: moment.content.slice(0, 42) || t("newMoment") || "记录",
      time: moment.created_at,
      dateLabel: formatRecentItemDate(moment.created_at, language),
    }));
    const reflectionItems = reflections.slice(0, 3).map((reflection) => {
      const parsed = parseReflectionContent(reflection);
      return {
        id: `reflection-${reflection.id}`,
        kind: "reflection" as const,
        itemId: reflection.id,
        title: parsed.title || parsed.body.slice(0, 42),
        time: reflection.updated_at || reflection.created_at,
        dateLabel: formatRecentItemDate(
          reflection.updated_at || reflection.created_at,
          language,
        ),
      };
    });

    return [...momentItems, ...reflectionItems]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }, [language, moments, reflections, t]);

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
    recentItems,
    openRecentItem,
    toggleGoalCompleted,
    deleteHabit,
    deleteTodayGoal,
  };
}
