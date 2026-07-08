"use client";

import { useCallback, useEffect, useMemo } from "react";
import { flushOutbox } from "../../lib/localDb/syncEngine";
import { sortByCreatedAtDesc, withFormattedDate } from "./collectionUtils";
import type {
  GoalRecord,
  MomentRecord,
  ReflectionRecord,
  WorkspaceCollections,
  WorkspaceLoadingState,
} from "./types";
import { useWorkspaceCollection } from "./useWorkspaceCollection";

const BACKGROUND_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

export function useWorkspaceCollections(
  userId: string | null,
): WorkspaceCollections {
  const moments = useWorkspaceCollection<MomentRecord>({
    userId,
    collection: "moments",
  });
  const reflections = useWorkspaceCollection<ReflectionRecord>({
    userId,
    collection: "reflections",
  });
  const goals = useWorkspaceCollection<GoalRecord>({
    userId,
    collection: "goals",
  });

  const {
    items: momentItems,
    loading: momentsLoading,
    refresh: refreshMoments,
    add: addMoment,
    update: updateMoment,
    remove: deleteMoment,
  } = moments;
  const {
    items: reflectionItems,
    loading: reflectionsLoading,
    refresh: refreshReflections,
    add: addReflection,
    update: updateReflection,
    remove: deleteReflection,
  } = reflections;
  const {
    items: goalItems,
    loading: goalsLoading,
    setItems: setGoals,
    refresh: refreshGoals,
    add: addGoal,
    update: updateGoal,
    remove: deleteGoal,
    queueUpdate: queueGoalUpdate,
  } = goals;

  useEffect(() => {
    if (!userId) return;

    void flushOutbox();

    const interval = window.setInterval(() => {
      void refreshMoments();
      void refreshReflections();
      void refreshGoals();
    }, BACKGROUND_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [refreshGoals, refreshMoments, refreshReflections, userId]);

  const loading = useMemo<WorkspaceLoadingState>(
    () => ({
      moments: momentsLoading,
      reflections: reflectionsLoading,
      goals: goalsLoading,
    }),
    [goalsLoading, momentsLoading, reflectionsLoading],
  );

  const reorderGoals = useCallback(
    async (orderedIds: number[]) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
      const updatedAt = new Date().toISOString();
      const next = goalItems.map((goal) =>
        orderMap.has(goal.id)
          ? (withFormattedDate({
              ...goal,
              sort_order: orderMap.get(goal.id)!,
              updated_at: updatedAt,
            }) as GoalRecord)
          : goal,
      );

      await Promise.all(
        next
          .filter((goal) => orderMap.has(goal.id))
          .map((goal) => queueGoalUpdate(goal, "update")),
      );

      setGoals(sortByCreatedAtDesc(next));
    },
    [goalItems, queueGoalUpdate, setGoals],
  );

  const handleRefreshMoments = useCallback(
    () => refreshMoments(),
    [refreshMoments],
  );
  const handleRefreshReflections = useCallback(
    () => refreshReflections(),
    [refreshReflections],
  );
  const handleRefreshGoals = useCallback(() => refreshGoals(), [refreshGoals]);

  const exportData = useCallback(() => {
    return JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        moments: momentItems,
        goals: goalItems,
        reflections: reflectionItems,
      },
      null,
      2,
    );
  }, [goalItems, momentItems, reflectionItems]);

  return useMemo(
    () => ({
      moments: momentItems,
      reflections: reflectionItems,
      goals: goalItems,
      loading,
      refreshMoments: handleRefreshMoments,
      refreshReflections: handleRefreshReflections,
      refreshGoals: handleRefreshGoals,
      addMoment,
      addReflection,
      addGoal,
      updateMoment,
      updateReflection,
      updateGoal,
      reorderGoals,
      deleteMoment,
      deleteReflection,
      deleteGoal,
      exportData,
    }),
    [
      addGoal,
      addMoment,
      addReflection,
      deleteGoal,
      deleteMoment,
      deleteReflection,
      exportData,
      goalItems,
      handleRefreshGoals,
      handleRefreshMoments,
      handleRefreshReflections,
      loading,
      momentItems,
      reflectionItems,
      reorderGoals,
      updateGoal,
      updateMoment,
      updateReflection,
    ],
  );
}
