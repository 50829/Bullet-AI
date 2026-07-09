"use client";

import { useCallback, useMemo, useState } from "react";
import type { GoalRecord } from "../../../features/goals/types";
import type { HabitView } from "../../../features/habits/types";
import { useWorkspaceData } from "../../../features/workspace/data";
import { useGoalPlanningPage } from "../../../features/goals/planning/useGoalPlanningPage";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useToast } from "../../../shared/components/ui/Toast";
import { useWorkspacePageLoading } from "../../components/layout/WorkspaceNavigationContext";
import { useAssistantPanel } from "../../hooks/useAssistantPanel";
import { useDeleteConfirm } from "../../hooks/useDeleteConfirm";

type DeleteTarget = {
  type: "goal" | "habit";
  id: number;
  name: string;
  imagePath?: string | null;
};

export function useGoalsPageController() {
  const { goals: goalsController, habits: habitsController } =
    useWorkspaceData();
  const goalPage = useGoalPlanningPage({ goalsController });
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
  const { t, language } = useLanguage();
  const { showToast } = useToast();
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
          await goalPage.deleteGoal(target.id, target.imagePath);
        } else {
          await deleteHabit(target.id);
        }
      } catch (err) {
        console.error("删除异常:", err);
        showToast({
          type: "error",
          message: t("deleteFailed") || "删除失败，请稍后重试",
        });
        if (target.type === "goal") void goalPage.refreshGoals();
        throw err;
      }
    });
  };

  const isInitialLoading =
    (goalPage.loading && goalPage.goals.length === 0) ||
    (habitsLoading && habits.length === 0);
  const isNavigationLoading = useWorkspacePageLoading(isInitialLoading);

  return {
    t,
    language,
    goalPage,
    assistantPanel,
    isInitialLoading,
    isNavigationLoading,
    deleteConfirm,
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
      habits,
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
