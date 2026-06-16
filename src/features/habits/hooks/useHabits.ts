"use client";

import { useCallback, useEffect, useState } from "react";
import { toDateKey } from "../../../lib/date/dateUtils";
import type { CreateHabitInput, HabitView } from "../types";
import {
  createHabit as createHabitRecord,
  deleteHabit as deleteHabitRecord,
  fetchHabitViews,
  toggleHabitCheckin,
} from "../services/habitService";

export function useHabits() {
  const [habits, setHabits] = useState<HabitView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextHabits = await fetchHabitViews();
      setHabits(nextHabits);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载习惯失败";
      setError(message);
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createHabit = useCallback(
    async (input: CreateHabitInput) => {
      setSaving(true);
      setError(null);

      try {
        await createHabitRecord(input);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "保存习惯失败";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const removeHabit = useCallback(
    async (habitId: number) => {
      setSaving(true);
      setError(null);

      try {
        await deleteHabitRecord(habitId);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "删除习惯失败";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const toggleCheckin = useCallback(
    async (habit: HabitView, dateKey: string) => {
      setSaving(true);
      setError(null);

      try {
        await toggleHabitCheckin(habit, dateKey);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "打卡失败";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const checkinToday = useCallback(
    async (habit: HabitView) => {
      if (habit.checkedToday) return;
      await toggleCheckin(habit, toDateKey());
    },
    [toggleCheckin]
  );

  return {
    habits,
    loading,
    saving,
    error,
    refresh,
    createHabit,
    removeHabit,
    toggleCheckin,
    checkinToday,
  };
}
