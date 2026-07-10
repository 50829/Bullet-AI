"use client";

import { useMemo, useRef, useState } from "react";
import { createEntityId } from "../../../domain/ids";
import type { GoalPlan } from "../../../lib/ai/goalPlan";
import type { useGoals } from "../hooks/useGoals";
import {
  shouldShowGoal,
  sortGoalsByCompletion,
  sortGoalsByOrder,
} from "../goalVisibility";
import { useCompletedGoalRetention } from "../hooks/useCompletedGoalRetention";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useToast } from "../../../shared/components/ui/Toast";
import { toDateKey } from "../../../lib/date/dateUtils";

export type GoalRightViewMode = "unscheduled" | "schedule";

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type UseGoalPlanningPageInput = {
  goalsController: ReturnType<typeof useGoals>;
  hiddenGoalClientIds?: ReadonlySet<string>;
};

export function useGoalPlanningPage({
  goalsController,
  hiddenGoalClientIds,
}: UseGoalPlanningPageInput) {
  const goals = useMemo(
    () =>
      goalsController.goals.filter(
        (goal) => !hiddenGoalClientIds?.has(goal.clientId),
      ),
    [goalsController.goals, hiddenGoalClientIds],
  );
  const {
    updateGoal,
    createGoal,
    toggleGoalCompleted: toggleGoalCommand,
  } = goalsController;
  const { t } = useLanguage();
  const { showToast } = useToast();
  const completedGoalRetention = useCompletedGoalRetention();
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    getTodayDate(),
  );
  const [rightViewMode, setRightViewMode] =
    useState<GoalRightViewMode>("unscheduled");
  const planTaskIds = useRef(new WeakMap<GoalPlan, string[]>());

  const selectedDateGoals = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = toDateKey(selectedDate);
    return sortGoalsByCompletion(
      sortGoalsByOrder(
        goals.filter((goal) => {
          if (goal.dueDate !== dateStr) return false;
          return shouldShowGoal(goal, completedGoalRetention);
        }),
      ),
    );
  }, [completedGoalRetention, goals, selectedDate]);

  const unscheduledGoals = useMemo(
    () =>
      sortGoalsByCompletion(
        sortGoalsByOrder(
          goals.filter(
            (goal) =>
              !goal.dueDate && shouldShowGoal(goal, completedGoalRetention),
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
      await toggleGoalCommand(goal);
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : t("updateFailed") || "更新失败",
      });
    }
  };

  const scheduleGoalForSelectedDate = async (goal: (typeof goals)[number]) => {
    if (!selectedDate) return;
    try {
      await updateGoal(goal.clientId, {
        dueDate: toDateKey(selectedDate),
      });
      setRightViewMode("schedule");
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : t("updateFailed") || "更新失败",
      });
    }
  };

  const moveGoalToUnscheduled = async (goal: (typeof goals)[number]) => {
    try {
      await updateGoal(goal.clientId, {
        dueDate: null,
      });
      setRightViewMode("unscheduled");
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : t("updateFailed") || "更新失败",
      });
    }
  };

  const addTasksFromAIReply = async (plan: GoalPlan) => {
    const tasks = [
      ...plan.daily.map((task) => ({
        ...task,
        dueDate: toDateKey(getTodayDate()),
      })),
      ...plan.future.map((task) => ({ ...task, dueDate: null })),
    ];
    const clientIds =
      planTaskIds.current.get(plan) ?? tasks.map(() => createEntityId("goal"));
    planTaskIds.current.set(plan, clientIds);
    const lowestOrder = goals.reduce(
      (lowest, goal) => Math.min(lowest, goal.sortOrder),
      0,
    );

    await Promise.all(
      tasks.map((task, index) =>
        createGoal({
          clientId: clientIds[index],
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          sortOrder: lowestOrder - tasks.length + index,
        }),
      ),
    );
  };

  return {
    ...goalsController,
    goals,
    selectedDate,
    rightViewMode,
    selectedDateGoals,
    unscheduledGoals,
    setRightViewMode,
    handleDateSelect,
    toggleGoalCompleted,
    scheduleGoalForSelectedDate,
    moveGoalToUnscheduled,
    addTasksFromAIReply,
  };
}
