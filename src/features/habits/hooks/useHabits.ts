"use client";

import { useCallback, useMemo, useState } from "react";
import { addDays, toDateKey } from "../../../lib/date/dateUtils";
import { createClientId } from "../../../lib/localDb/repository";
import { createOptimisticId } from "../../../lib/localFirst/ids";
import { useLocalFirstCollection } from "../../../lib/localFirst/useLocalFirstCollection";
import type {
  CreateHabitInput,
  HabitCheckin,
  HabitRecord,
  HabitView,
  UpdateHabitInput,
} from "../types";

type UseHabitsInput = {
  userId: string | null;
};

function calculateDailyStreak(checkins: HabitCheckin[]) {
  const checkedDates = new Set(
    checkins
      .filter((checkin) => checkin.checked)
      .map((checkin) => checkin.checked_on),
  );
  let cursor = toDateKey();
  let streak = 0;

  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function projectHabit(
  habit: HabitRecord,
  allCheckins: HabitCheckin[],
): HabitView {
  const checkins = allCheckins
    .filter(
      (checkin) =>
        checkin.habit_client_id === habit.client_id &&
        checkin.checked &&
        !checkin.deleted_at,
    )
    .sort((a, b) => b.checked_on.localeCompare(a.checked_on));
  const todayCheckin =
    checkins.find((checkin) => checkin.checked_on === toDateKey()) ?? null;

  return {
    ...habit,
    checkedToday: Boolean(todayCheckin),
    todayCheckinId: todayCheckin?.id ?? null,
    checkinCount: checkins.length,
    lastCheckedOn: checkins[0]?.checked_on ?? null,
    streak: habit.frequency === "daily" ? calculateDailyStreak(checkins) : 0,
    checkins,
  };
}

export function useHabits({ userId }: UseHabitsInput) {
  const habitsCollection = useLocalFirstCollection<HabitRecord>({
    userId,
    collection: "habits",
  });
  const checkinsCollection = useLocalFirstCollection<HabitCheckin>({
    userId,
    collection: "habit_checkins",
    remoteOrder: { column: "checked_on", ascending: false },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const habits = useMemo(
    () =>
      habitsCollection.items
        .filter((habit) => !habit.deleted_at)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((habit) => projectHabit(habit, checkinsCollection.items)),
    [checkinsCollection.items, habitsCollection.items],
  );

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("请先登录");
    return userId;
  }, [userId]);

  const runMutation = useCallback(
    async (operation: (activeUserId: string) => Promise<unknown>) => {
      const activeUserId = requireUser();
      setSaving(true);
      setError(null);
      try {
        await operation(activeUserId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "保存习惯失败";
        setError(message);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [requireUser],
  );

  const refresh = useCallback(async () => {
    requireUser();
    await Promise.all([
      habitsCollection.refresh(undefined, { showLoading: true }),
      checkinsCollection.refresh(undefined, { showLoading: true }),
    ]);
  }, [checkinsCollection, habitsCollection, requireUser]);

  const createHabit = useCallback(
    async (input: CreateHabitInput) => {
      await runMutation(async (activeUserId) => {
        const now = new Date().toISOString();
        await habitsCollection.add({
          id: createOptimisticId(),
          client_id: input.client_id ?? createClientId("habit"),
          user_id: activeUserId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          frequency: input.frequency,
          color: input.color ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      });
    },
    [habitsCollection, runMutation],
  );

  const updateHabit = useCallback(
    async (habitId: number, input: UpdateHabitInput) => {
      await runMutation(async () => {
        const current = habitsCollection.items.find(
          (habit) => habit.id === habitId,
        );
        if (!current) throw new Error("习惯不存在或已删除");

        await habitsCollection.update(habitId, {
          name: typeof input.name === "string" ? input.name.trim() : current.name,
          description:
            typeof input.description === "string"
              ? input.description.trim() || null
              : current.description,
          frequency: input.frequency ?? current.frequency,
          color: "color" in input ? (input.color ?? null) : current.color,
        });
      });
    },
    [habitsCollection, runMutation],
  );

  const removeHabit = useCallback(
    async (habitId: number) => {
      await runMutation(async () => {
        const habit = habitsCollection.items.find((item) => item.id === habitId);
        if (!habit) return;

        const related = checkinsCollection.items.filter(
          (checkin) => checkin.habit_client_id === habit.client_id,
        );
        await Promise.all(
          related.map((checkin) => checkinsCollection.remove(checkin.id)),
        );
        await habitsCollection.remove(habit.id);
      });
    },
    [checkinsCollection, habitsCollection, runMutation],
  );

  const setHabitCheckin = useCallback(
    async (habit: HabitView, checkedOn: string, checked: boolean) => {
      await runMutation(async (activeUserId) => {
        const createdOn = toDateKey(habit.created_at);
        const today = toDateKey();
        if (checkedOn < createdOn)
          throw new Error("不能给习惯创建日前的日期打卡");
        if (checkedOn > today) throw new Error("不能提前给未来日期打卡");

        const clientId = `habit-checkin:${habit.client_id}:${checkedOn}`;
        const current = checkinsCollection.items.find(
          (checkin) => checkin.client_id === clientId,
        );
        const now = new Date().toISOString();
        const checkin: HabitCheckin = {
          id: current?.id ?? createOptimisticId(),
          client_id: clientId,
          user_id: activeUserId,
          habit_id: current?.habit_id ?? null,
          habit_client_id: habit.client_id,
          checked_on: checkedOn,
          checked,
          created_at: current?.created_at ?? now,
          updated_at: now,
          deleted_at: null,
        };

        if (current) {
          await checkinsCollection.update(current.id, checkin);
          return;
        }

        await checkinsCollection.add(checkin);
      });
    },
    [checkinsCollection, runMutation],
  );

  const toggleCheckin = useCallback(
    async (habit: HabitView, dateKey: string) => {
      const checked = !habit.checkins.some(
        (checkin) => checkin.checked_on === dateKey,
      );
      await setHabitCheckin(habit, dateKey, checked);
    },
    [setHabitCheckin],
  );

  const checkinToday = useCallback(
    async (habit: HabitView) => {
      if (!habit.checkedToday) await toggleCheckin(habit, toDateKey());
    },
    [toggleCheckin],
  );

  return {
    habits,
    loading: habitsCollection.loading || checkinsCollection.loading,
    saving,
    error,
    refresh,
    createHabit,
    updateHabit,
    removeHabit,
    toggleCheckin,
    checkinToday,
  };
}
