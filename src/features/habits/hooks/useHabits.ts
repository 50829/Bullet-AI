"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { addDays, toDateKey } from "../../../lib/date/dateUtils";
import type { CreateHabitInput, HabitCheckin, HabitView } from "../types";
import {
  createHabit as createHabitRecord,
  deleteHabit as deleteHabitRecord,
  fetchHabitViews,
  toggleHabitCheckin,
} from "../services/habitService";

type HabitState = {
  habits: HabitView[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
};

const listeners = new Set<() => void>();
let state: HabitState = {
  habits: [],
  loading: true,
  saving: false,
  error: null,
  loaded: false,
};
let refreshPromise: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(updates: Partial<HabitState>) {
  state = { ...state, ...updates };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function calculateDailyStreak(checkins: HabitCheckin[]) {
  const checkedDates = new Set(checkins.map((checkin) => checkin.checked_on));
  let cursor = toDateKey();
  let streak = 0;

  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function rebuildHabit(habit: HabitView, checkins: HabitCheckin[]): HabitView {
  const sortedCheckins = [...checkins].sort((a, b) => b.checked_on.localeCompare(a.checked_on));
  const today = toDateKey();
  const todayCheckin = sortedCheckins.find((checkin) => checkin.checked_on === today) ?? null;

  return {
    ...habit,
    checkins: sortedCheckins,
    checkedToday: Boolean(todayCheckin),
    todayCheckinId: todayCheckin?.id ?? null,
    checkinCount: sortedCheckins.length,
    lastCheckedOn: sortedCheckins[0]?.checked_on ?? null,
    streak: habit.frequency === "daily" ? calculateDailyStreak(sortedCheckins) : 0,
  };
}

function optimisticToggle(habit: HabitView, dateKey: string) {
  return state.habits.map((item) => {
    if (item.id !== habit.id) return item;

    const existing = item.checkins.find((checkin) => checkin.checked_on === dateKey);
    const nextCheckins = existing
      ? item.checkins.filter((checkin) => checkin.checked_on !== dateKey)
      : [
          {
            id: -Date.now(),
            user_id: "",
            habit_id: item.id,
            checked_on: dateKey,
            created_at: new Date().toISOString(),
          },
          ...item.checkins,
        ];

    return rebuildHabit(item, nextCheckins);
  });
}

async function refreshHabitStore(options?: { silent?: boolean }) {
  if (refreshPromise) return refreshPromise;

  if (!options?.silent) {
    setState({ loading: true, error: null });
  }

  refreshPromise = (async () => {
    try {
      const nextHabits = await fetchHabitViews();
      setState({
        habits: nextHabits,
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载习惯失败";
      setState({
        error: message,
        loading: false,
        loaded: true,
      });
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function useHabits() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!state.loaded && !state.loading) {
      void refreshHabitStore();
    }
    if (!state.loaded && state.loading) {
      void refreshHabitStore();
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshHabitStore();
  }, []);

  const createHabit = useCallback(async (input: CreateHabitInput) => {
    setState({ saving: true, error: null });

    const optimisticHabit: HabitView = {
      id: Date.now(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      frequency: input.frequency,
      color: input.color ?? null,
      created_at: new Date().toISOString(),
      checkedToday: false,
      todayCheckinId: null,
      checkinCount: 0,
      lastCheckedOn: null,
      streak: 0,
      checkins: [],
      _local: { pending: true },
    } as HabitView;

    setState({ habits: [optimisticHabit, ...state.habits] });

    try {
      await createHabitRecord(input);
      setState({ saving: false });
      void refreshHabitStore({ silent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存习惯失败";
      setState({
        habits: state.habits.filter((habit) => habit.id !== optimisticHabit.id),
        saving: false,
        error: message,
      });
      throw err;
    }
  }, []);

  const removeHabit = useCallback(async (habitId: number) => {
    const previous = state.habits;
    setState({
      habits: state.habits.filter((habit) => habit.id !== habitId),
      saving: true,
      error: null,
    });

    try {
      await deleteHabitRecord(habitId);
      setState({ saving: false });
      void refreshHabitStore({ silent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除习惯失败";
      setState({ habits: previous, saving: false, error: message });
      throw err;
    }
  }, []);

  const toggleCheckin = useCallback(async (habit: HabitView, dateKey: string) => {
    const previous = state.habits;
    setState({
      habits: optimisticToggle(habit, dateKey),
      saving: true,
      error: null,
    });

    try {
      await toggleHabitCheckin(habit, dateKey);
      setState({ saving: false });
      void refreshHabitStore({ silent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "打卡失败";
      setState({ habits: previous, saving: false, error: message });
      throw err;
    }
  }, []);

  const checkinToday = useCallback(
    async (habit: HabitView) => {
      if (habit.checkedToday) return;
      await toggleCheckin(habit, toDateKey());
    },
    [toggleCheckin],
  );

  return {
    habits: snapshot.habits,
    loading: snapshot.loading,
    saving: snapshot.saving,
    error: snapshot.error,
    refresh,
    createHabit,
    removeHabit,
    toggleCheckin,
    checkinToday,
  };
}
