"use client";

import { useCallback, useMemo, useState } from "react";
import type { GoalRecord } from "@/features/goals/types";
import type { HabitView } from "@/features/habits/types";
import {
  useWorkspaceGoals,
  useWorkspaceHabits,
} from "@/features/workspace/providers";
import { useGoalPlanningPage } from "@/features/goals/planning/useGoalPlanningPage";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useDeferredHardDelete } from "@/features/workspace/hooks/useDeferredHardDelete";
import { useAssistantPanel } from "@/app/(workspace)/_hooks/useAssistantPanel";
import { useDeleteConfirm } from "@/app/(workspace)/_hooks/useDeleteConfirm";

type DeleteTarget = {
  type: "goal" | "habit";
  id: string;
  name: string;
};

export function useGoalsPageController() {
  const goalsController = useWorkspaceGoals();
  const habitsController = useWorkspaceHabits();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const deferredDelete = useDeferredHardDelete<DeleteTarget>({
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
  const hiddenGoalClientIds = useMemo(
    () =>
      new Set(
        deferredDelete.pendingDelete?.type === "goal"
          ? [deferredDelete.pendingDelete.id]
          : [],
      ),
    [deferredDelete.pendingDelete],
  );
  const goalPage = useGoalPlanningPage({
    goalsController,
    hiddenGoalClientIds,
  });
  const {
    habits,
    loading: habitsLoading,
    saving: habitsSaving,
    error: habitsError,
    createHabit,
    updateHabit,
    deleteHabit,
    checkinToday,
    toggleCheckin,
  } = habitsController;
  const visibleHabits = useMemo(
    () =>
      habits.filter(
        (habit) =>
          deferredDelete.pendingDelete?.type !== "habit" ||
          habit.clientId !== deferredDelete.pendingDelete.id,
      ),
    [deferredDelete.pendingDelete, habits],
  );
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitView | null>(null);
  const deleteConfirm = useDeleteConfirm<DeleteTarget>();

  const openGoalModal = useCallback(() => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  }, []);

  const closeGoalModal = useCallback(() => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  }, []);

  const openEditGoalModal = useCallback((goal: GoalRecord) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  }, []);

  const openHabitModal = useCallback(() => {
    setEditingHabit(null);
    setIsHabitModalOpen(true);
  }, []);

  const closeHabitModal = useCallback(() => {
    setIsHabitModalOpen(false);
    setEditingHabit(null);
  }, []);

  const openEditHabitModal = useCallback((habit: HabitView) => {
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
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
          deferredDelete.scheduleDelete(target, () =>
            goalPage.deleteGoal(target.id),
          );
        } else {
          deferredDelete.scheduleDelete(target, () => deleteHabit(target.id));
        }
      } catch (err) {
        showToast({
          type: "error",
          message: t("deleteFailed") || "删除失败，请稍后重试",
        });
        throw err;
      }
    });
  };

  const isInitialLoading =
    (goalPage.loading && goalPage.goals.length === 0) ||
    (habitsLoading && visibleHabits.length === 0);
  return {
    t,
    language,
    goalPage,
    assistantPanel,
    isInitialLoading,
    deleteConfirm,
    deferredDelete,
    handleDelete,
    goalModal: {
      isOpen: isGoalModalOpen,
      editingGoal,
      openCreate: openGoalModal,
      openEdit: openEditGoalModal,
      close: closeGoalModal,
    },
    habitModal: {
      isOpen: isHabitModalOpen,
      editingHabit,
      openCreate: openHabitModal,
      openEdit: openEditHabitModal,
      close: closeHabitModal,
    },
    habitsSection: {
      habits: visibleHabits,
      loading: habitsLoading,
      saving: habitsSaving,
      error: habitsError,
      createHabit,
      updateHabit,
      checkinToday,
      toggleCheckin,
    },
  };
}
