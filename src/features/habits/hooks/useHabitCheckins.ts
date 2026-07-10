"use client";

import { useCallback } from "react";
import { hasUnresolvedSyncIssue } from "@/domain/sync";
import { toDateKey } from "@/lib/date/dateUtils";
import { useDataMutation } from "@/data";
import type { ResolvedWeekStartsOn } from "@/lib/profile/preferences";
import { useSyncedResource } from "@/data/react/useSyncedResource";
import { startOfWeekKey } from "../habitProjection";
import type { HabitCheckin, HabitView } from "../types";

type RunHabitMutation = (
  operation: (activeUserId: string) => Promise<unknown>,
) => Promise<void>;

function checkinFields(checkin: HabitCheckin) {
  return {
    habitClientId: checkin.habitClientId,
    checkedOn: checkin.checkedOn,
  };
}

export function useHabitCheckins({
  userId,
  weekStartsOn,
  runMutation,
}: {
  userId: string | null;
  weekStartsOn: ResolvedWeekStartsOn;
  runMutation: RunHabitMutation;
}) {
  const resource = useSyncedResource(userId, "habit_checkins");
  const mutation = useDataMutation(userId ?? "anonymous", "habit_checkins");

  const setHabitCheckin = useCallback(
    async (habit: HabitView, selectedDate: string, checked: boolean) => {
      await runMutation(async (activeUserId) => {
        if (hasUnresolvedSyncIssue(habit)) {
          throw new Error("请先在设置中处理这条习惯的同步冲突");
        }
        const createdOn = habit.startedOn;
        const today = toDateKey();
        if (selectedDate < createdOn) {
          throw new Error("不能给习惯创建日前的日期打卡");
        }
        if (selectedDate > today) throw new Error("不能提前给未来日期打卡");

        const periodKey =
          habit.frequency === "weekly"
            ? startOfWeekKey(selectedDate, weekStartsOn)
            : selectedDate;
        const current = resource.items.filter(
          (checkin) =>
            checkin.habitClientId === habit.clientId &&
            (habit.frequency === "daily"
              ? checkin.checkedOn === periodKey
              : startOfWeekKey(checkin.checkedOn, weekStartsOn) === periodKey),
        );

        if (!checked) {
          if (current.some(hasUnresolvedSyncIssue)) {
            throw new Error("请先在设置中处理这次打卡的同步冲突");
          }
          await Promise.all(
            current.map((checkin) =>
              mutation.mutateAsync({
                kind: "delete",
                clientId: checkin.clientId,
                baseVersion: checkin.version,
                optimistic: { ...checkin, sync: undefined },
              }),
            ),
          );
          return;
        }
        if (current.length > 0) return;

        const now = new Date().toISOString();
        const clientId = `habit-checkin:${habit.clientId}:${periodKey}`;
        const optimistic: HabitCheckin = {
          clientId,
          userId: activeUserId,
          version: 0,
          createdAt: now,
          updatedAt: now,
          habitClientId: habit.clientId,
          checkedOn: selectedDate,
        };
        await mutation.mutateAsync({
          kind: "create",
          clientId,
          baseVersion: null,
          optimistic,
          changes: checkinFields(optimistic),
        });
      });
    },
    [mutation, resource.items, runMutation, weekStartsOn],
  );

  const toggleCheckin = useCallback(
    async (habit: HabitView, dateKey: string) => {
      const periodKey =
        habit.frequency === "weekly"
          ? startOfWeekKey(dateKey, weekStartsOn)
          : dateKey;
      const isChecked = resource.items.some(
        (checkin) =>
          checkin.habitClientId === habit.clientId &&
          (habit.frequency === "daily"
            ? checkin.checkedOn === periodKey
            : startOfWeekKey(checkin.checkedOn, weekStartsOn) === periodKey),
      );
      await setHabitCheckin(habit, dateKey, !isChecked);
    },
    [resource.items, setHabitCheckin, weekStartsOn],
  );

  const checkinToday = useCallback(
    async (habit: HabitView) => {
      if (!habit.isCurrentPeriodComplete) {
        await setHabitCheckin(habit, toDateKey(), true);
      }
    },
    [setHabitCheckin],
  );

  const removeForUnsyncedHabit = useCallback(
    async (habitClientId: string) => {
      const pending = resource.items.filter(
        (checkin) => checkin.habitClientId === habitClientId,
      );
      if (pending.some(hasUnresolvedSyncIssue)) {
        throw new Error("请先在设置中处理这个习惯的打卡同步冲突");
      }
      await Promise.all(
        pending.map((checkin) =>
          mutation.mutateAsync({
            kind: "delete",
            clientId: checkin.clientId,
            baseVersion: checkin.version,
            optimistic: { ...checkin, sync: undefined },
          }),
        ),
      );
    },
    [mutation, resource.items],
  );

  return {
    items: resource.items,
    loading: resource.loading,
    error: resource.error,
    saving: mutation.isPending,
    refresh: resource.refresh,
    toggleCheckin,
    checkinToday,
    removeForUnsyncedHabit,
  };
}
