"use client";

import { useCallback, useMemo } from "react";
import { createEntityId } from "../../../domain/ids";
import { hasUnresolvedSyncIssue } from "../../../domain/sync";
import { useDataMutation } from "../../../lib/data-v2";
import { useWorkspaceResource } from "../../workspace/data/useWorkspaceResourceV2";
import type { CreateGoalInput, GoalRecord, UpdateGoalInput } from "../types";

type UseGoalsInput = {
  userId: string | null;
};

function goalFields(goal: GoalRecord) {
  return {
    title: goal.title,
    description: goal.description,
    dueDate: goal.dueDate,
    completedAt: goal.completedAt,
    color: goal.color,
    sortOrder: goal.sortOrder,
  };
}

function normalizeGoalChanges(input: UpdateGoalInput) {
  if (Object.hasOwn(input, "title") && !input.title?.trim()) {
    throw new Error("目标标题不能为空");
  }
  return {
    ...(Object.hasOwn(input, "title") ? { title: input.title!.trim() } : {}),
    ...(Object.hasOwn(input, "description")
      ? { description: input.description?.trim() ?? "" }
      : {}),
    ...(Object.hasOwn(input, "dueDate")
      ? { dueDate: input.dueDate ?? null }
      : {}),
    ...(Object.hasOwn(input, "completedAt")
      ? { completedAt: input.completedAt ?? null }
      : {}),
    ...(Object.hasOwn(input, "color") ? { color: input.color ?? null } : {}),
    ...(Object.hasOwn(input, "sortOrder") && typeof input.sortOrder === "number"
      ? { sortOrder: input.sortOrder }
      : {}),
  } satisfies UpdateGoalInput;
}

export function useGoals({ userId }: UseGoalsInput) {
  const resource = useWorkspaceResource(userId, "goals");
  const mutation = useDataMutation(userId ?? "anonymous", "goals");

  const goals = useMemo(
    () =>
      [...resource.items].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          right.createdAt.localeCompare(left.createdAt),
      ),
    [resource.items],
  );

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("请先登录");
    return userId;
  }, [userId]);

  const createGoal = useCallback(
    async (input: CreateGoalInput) => {
      const activeUserId = requireUser();
      const now = new Date().toISOString();
      const clientId = input.clientId ?? createEntityId("goal");
      if (goals.some((goal) => goal.clientId === clientId)) return;
      const lowestOrder = goals.reduce(
        (lowest, goal) => Math.min(lowest, goal.sortOrder),
        0,
      );
      const optimistic: GoalRecord = {
        clientId,
        userId: activeUserId,
        version: 0,
        createdAt: now,
        updatedAt: now,
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        dueDate: input.dueDate ?? null,
        completedAt: input.completedAt ?? null,
        color: input.color ?? null,
        sortOrder: input.sortOrder ?? lowestOrder - 1,
      };
      if (!optimistic.title) throw new Error("目标标题不能为空");

      await mutation.mutateAsync({
        kind: "create",
        clientId,
        baseVersion: null,
        optimistic,
        changes: goalFields(optimistic),
      });
    },
    [goals, mutation, requireUser],
  );

  const updateGoal = useCallback(
    async (clientId: string, input: UpdateGoalInput) => {
      requireUser();
      const current = goals.find((goal) => goal.clientId === clientId);
      if (!current) throw new Error("目标不存在或已删除");
      if (hasUnresolvedSyncIssue(current)) {
        throw new Error("请先在设置中处理这条目标的同步冲突");
      }
      const changes = normalizeGoalChanges(input);
      if (Object.keys(changes).length === 0) return;
      const optimistic: GoalRecord = {
        ...current,
        ...changes,
        sync: undefined,
        updatedAt: new Date().toISOString(),
      };

      await mutation.mutateAsync({
        kind: "patch",
        clientId,
        baseVersion: current.version,
        optimistic,
        changes,
      });
    },
    [goals, mutation, requireUser],
  );

  const reorderGoals = useCallback(
    async (orderedClientIds: string[]) => {
      const order = new Map(
        orderedClientIds.map((clientId, index) => [clientId, index]),
      );
      await Promise.all(
        goals
          .filter((goal) => order.has(goal.clientId))
          .map((goal) =>
            updateGoal(goal.clientId, {
              sortOrder: order.get(goal.clientId)!,
            }),
          ),
      );
    },
    [goals, updateGoal],
  );

  const toggleGoalCompleted = useCallback(
    async (goal: GoalRecord) => {
      await updateGoal(goal.clientId, {
        completedAt: goal.completedAt ? null : new Date().toISOString(),
      });
    },
    [updateGoal],
  );

  const deleteGoal = useCallback(
    async (clientId: string) => {
      requireUser();
      const current = goals.find((goal) => goal.clientId === clientId);
      if (!current) return;
      if (hasUnresolvedSyncIssue(current)) {
        throw new Error("请先在设置中处理这条目标的同步冲突");
      }
      await mutation.mutateAsync({
        kind: "delete",
        clientId,
        baseVersion: current.version,
        optimistic: { ...current, sync: undefined },
      });
    },
    [goals, mutation, requireUser],
  );

  return useMemo(
    () => ({
      goals,
      loading: resource.loading,
      error:
        resource.error instanceof Error
          ? resource.error.message
          : resource.error
            ? String(resource.error)
            : null,
      refreshGoals: async () => {
        await resource.refresh();
      },
      createGoal,
      updateGoal,
      toggleGoalCompleted,
      reorderGoals,
      deleteGoal,
    }),
    [
      createGoal,
      deleteGoal,
      goals,
      reorderGoals,
      resource,
      toggleGoalCompleted,
      updateGoal,
    ],
  );
}
