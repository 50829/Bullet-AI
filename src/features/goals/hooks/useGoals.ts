"use client";

import { useCallback, useMemo } from "react";
import { createClientId } from "../../../lib/localDb/repository";
import {
  createOptimisticId,
  sortByCreatedAtDesc,
  withFormattedDate,
} from "../../../lib/localFirst/collectionUtils";
import { useLocalFirstCollection } from "../../../lib/localFirst/useLocalFirstCollection";
import { useWorkspaceSessionContext } from "../../workspace/WorkspaceContext";
import type { CreateGoalInput, GoalRecord, UpdateGoalInput } from "../types";

export function useGoals() {
  const { userId } = useWorkspaceSessionContext();
  const collection = useLocalFirstCollection<GoalRecord>({
    userId,
    collection: "goals",
  });

  const addGoal = useCallback(
    async (input: CreateGoalInput) => {
      const now = new Date().toISOString();
      const createdAt = input.created_at ?? now;
      await collection.add({
        id: input.id ?? createOptimisticId(),
        client_id: input.client_id ?? createClientId("goal"),
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        due_date: input.due_date ?? input.dueDate ?? null,
        status: input.status ?? "pending",
        progress: input.progress ?? 0,
        color: input.color ?? null,
        sort_order: input.sort_order ?? null,
        image_url: input.image_url ?? null,
        image_path: input.image_path ?? null,
        created_at: createdAt,
        updated_at: now,
      });
    },
    [collection],
  );

  const updateGoal = useCallback(
    async (id: number, updates: UpdateGoalInput) => {
      await collection.update(id, updates);
    },
    [collection],
  );

  const reorderGoals = useCallback(
    async (orderedIds: number[]) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
      const updatedAt = new Date().toISOString();
      const next = collection.items.map((goal) =>
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
          .map((goal) => collection.queueUpdate(goal, "update")),
      );

      collection.setItems(sortByCreatedAtDesc(next));
    },
    [collection],
  );

  return useMemo(
    () => ({
      goals: collection.items,
      loading: collection.loading,
      refreshGoals: () => collection.refresh(),
      addGoal,
      updateGoal,
      reorderGoals,
      deleteGoal: collection.remove,
    }),
    [addGoal, collection, reorderGoals, updateGoal],
  );
}
