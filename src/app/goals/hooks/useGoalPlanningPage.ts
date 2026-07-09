"use client";

import { useMemo, useState } from "react";
import type { GoalPlan } from "../../../features/goals/types";
import {
  isGoalCompleted,
  shouldShowGoal,
  sortGoalsByCompletion,
  sortGoalsByOrder,
} from "../../../features/goals/goalVisibility";
import { useCompletedGoalRetention } from "../../../features/goals/hooks/useCompletedGoalRetention";
import { useGoalsContext } from "../../../features/workspace/WorkspaceContext";
import { createClientId } from "../../../lib/localDb/repository";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../components/ui/Toast";

export type GoalRightViewMode = "migration" | "schedule";

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useGoalPlanningPage() {
  const goalsContext = useGoalsContext();
  const { goals, updateGoal, addGoal } = goalsContext;
  const { t } = useLanguage();
  const { showToast } = useToast();
  const completedGoalRetention = useCompletedGoalRetention();
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    getTodayDate(),
  );
  const [rightViewMode, setRightViewMode] =
    useState<GoalRightViewMode>("migration");

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
          goals.filter(
            (goal) =>
              !goal.due_date && shouldShowGoal(goal, completedGoalRetention),
          ),
        ),
      ),
    [completedGoalRetention, goals],
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setRightViewMode("schedule");
  };

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
        message:
          err instanceof Error ? err.message : t("updateFailed") || "更新失败",
      });
    }
  };

  const migrateGoalToSelectedDate = async (goal: (typeof goals)[number]) => {
    if (!selectedDate) return;
    try {
      await updateGoal(goal.id, {
        due_date: formatDateToLocal(selectedDate),
      });
      setRightViewMode("schedule");
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : t("migrateFailed") || "迁移失败",
      });
    }
  };

  const moveGoalBack = async (goal: (typeof goals)[number]) => {
    try {
      await updateGoal(goal.id, {
        due_date: null,
      });
      setRightViewMode("migration");
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t("moveBackFailed") || "迁回失败",
      });
    }
  };

  const addTasksFromAIReply = async (plan: GoalPlan) => {
    const temporaryIdBase = Date.now();
    await Promise.all(
      [...plan.daily, ...plan.future].map((task, index) =>
        addGoal({
          id: temporaryIdBase + index,
          client_id: createClientId("goal"),
          title: task.title,
          description: task.description,
          due_date: null,
          status: "pending",
          progress: 0,
          image_url: null,
          image_path: null,
          created_at: new Date().toISOString(),
        }),
      ),
    );
  };

  return {
    ...goalsContext,
    selectedDate,
    rightViewMode,
    selectedDateGoals,
    migrationListGoals,
    setRightViewMode,
    handleDateSelect,
    toggleGoalCompleted,
    migrateGoalToSelectedDate,
    moveGoalBack,
    addTasksFromAIReply,
  };
}
