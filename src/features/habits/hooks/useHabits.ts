"use client";

import { useCallback, useMemo, useState } from "react";
import { createEntityId } from "../../../domain/ids";
import { hasUnresolvedSyncIssue } from "../../../domain/sync";
import { toDateKey } from "../../../lib/date/dateUtils";
import { useDataMutation } from "../../../lib/data-v2";
import { useResolvedWeekStartsOn } from "../../../shared/components/date/useResolvedWeekStartsOn";
import { useWorkspaceResource } from "../../workspace/data/useWorkspaceResourceV2";
import { projectHabit } from "../habitProjection";
import type { CreateHabitInput, HabitRecord, UpdateHabitInput } from "../types";
import { useHabitCheckins } from "./useHabitCheckins";

type UseHabitsInput = {
  userId: string | null;
};

function habitFields(habit: HabitRecord) {
  return {
    name: habit.name,
    description: habit.description,
    frequency: habit.frequency,
    color: habit.color,
    startedOn: habit.startedOn,
  };
}

function normalizeHabitChanges(
  input: UpdateHabitInput,
): Partial<ReturnType<typeof habitFields>> {
  if (Object.hasOwn(input, "name") && !input.name?.trim()) {
    throw new Error("习惯名称不能为空");
  }
  return {
    ...(Object.hasOwn(input, "name") ? { name: input.name!.trim() } : {}),
    ...(Object.hasOwn(input, "description")
      ? { description: input.description?.trim() || null }
      : {}),
    ...(Object.hasOwn(input, "frequency") && input.frequency
      ? { frequency: input.frequency }
      : {}),
    ...(Object.hasOwn(input, "color") ? { color: input.color ?? null } : {}),
  };
}

export function useHabits({ userId }: UseHabitsInput) {
  const habitsResource = useWorkspaceResource(userId, "habits");
  const habitMutation = useDataMutation(userId ?? "anonymous", "habits");
  const weekStartsOn = useResolvedWeekStartsOn();
  const [error, setError] = useState<string | null>(null);

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("请先登录");
    return userId;
  }, [userId]);

  const runMutation = useCallback(
    async (operation: (activeUserId: string) => Promise<unknown>) => {
      const activeUserId = requireUser();
      setError(null);
      try {
        await operation(activeUserId);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "保存习惯失败";
        setError(message);
        throw caught;
      }
    },
    [requireUser],
  );
  const checkins = useHabitCheckins({ userId, weekStartsOn, runMutation });

  const habits = useMemo(
    () =>
      [...habitsResource.items]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((habit) =>
          projectHabit(habit, checkins.items, toDateKey(), weekStartsOn),
        ),
    [checkins.items, habitsResource.items, weekStartsOn],
  );

  const refreshHabits = useCallback(async () => {
    requireUser();
    await Promise.all([habitsResource.refresh(), checkins.refresh()]);
  }, [checkins, habitsResource, requireUser]);

  const createHabit = useCallback(
    async (input: CreateHabitInput) => {
      await runMutation(async (activeUserId) => {
        const now = new Date().toISOString();
        const clientId = input.clientId ?? createEntityId("habit");
        if (habitsResource.items.some((habit) => habit.clientId === clientId)) {
          return;
        }
        const optimistic: HabitRecord = {
          clientId,
          userId: activeUserId,
          version: 0,
          createdAt: now,
          updatedAt: now,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          frequency: input.frequency,
          color: input.color ?? null,
          startedOn: toDateKey(),
        };
        if (!optimistic.name) throw new Error("习惯名称不能为空");

        await habitMutation.mutateAsync({
          kind: "create",
          clientId,
          baseVersion: null,
          optimistic,
          changes: habitFields(optimistic),
        });
      });
    },
    [habitMutation, habitsResource.items, runMutation],
  );

  const updateHabit = useCallback(
    async (habitClientId: string, input: UpdateHabitInput) => {
      await runMutation(async () => {
        const current = habitsResource.items.find(
          (habit) => habit.clientId === habitClientId,
        );
        if (!current) throw new Error("习惯不存在或已删除");
        if (hasUnresolvedSyncIssue(current)) {
          throw new Error("请先在设置中处理这条习惯的同步冲突");
        }
        const changes = normalizeHabitChanges(input);
        if (Object.keys(changes).length === 0) return;
        const optimistic: HabitRecord = {
          ...current,
          ...changes,
          sync: undefined,
          updatedAt: new Date().toISOString(),
        };
        await habitMutation.mutateAsync({
          kind: "patch",
          clientId: habitClientId,
          baseVersion: current.version,
          optimistic,
          changes,
        });
      });
    },
    [habitMutation, habitsResource.items, runMutation],
  );

  const deleteHabit = useCallback(
    async (habitClientId: string) => {
      await runMutation(async () => {
        const current = habitsResource.items.find(
          (habit) => habit.clientId === habitClientId,
        );
        if (!current) return;
        if (hasUnresolvedSyncIssue(current)) {
          throw new Error("请先在设置中处理这条习惯的同步冲突");
        }
        if (current.version === 0) {
          await checkins.removeForUnsyncedHabit(habitClientId);
        }
        await habitMutation.mutateAsync({
          kind: "delete",
          clientId: habitClientId,
          baseVersion: current.version,
          optimistic: { ...current, sync: undefined },
        });
      });
    },
    [checkins, habitMutation, habitsResource.items, runMutation],
  );

  return {
    habits,
    loading: habitsResource.loading || checkins.loading,
    saving: habitMutation.isPending || checkins.saving,
    error:
      error ??
      (habitsResource.error instanceof Error
        ? habitsResource.error.message
        : checkins.error instanceof Error
          ? checkins.error.message
          : null),
    refreshHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleCheckin: checkins.toggleCheckin,
    checkinToday: checkins.checkinToday,
  };
}
