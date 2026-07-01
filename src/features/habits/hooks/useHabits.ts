"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAppContext } from "../../../context/AppContext";
import { toDateKey } from "../../../lib/date/dateUtils";
import type { CreateHabitInput, HabitView, UpdateHabitInput } from "../types";
import {
  createHabitLocal,
  deleteHabitLocal,
  readHabitViews,
  refreshHabitViews,
  setHabitCheckinLocal,
  subscribeHabitViews,
  updateHabitLocal,
} from "../services/habitRepository";

type HabitState = {
  userId: string | null;
  habits: HabitView[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();
let state: HabitState = {
  userId: null,
  habits: [],
  loading: false,
  saving: false,
  error: null,
};
let refreshPromise: Promise<void> | null = null;
let refreshUserId: string | null = null;

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

async function loadLocal(userId: string) {
  const habits = await readHabitViews(userId);
  if (state.userId === userId) setState({ habits, loading: false });
}

async function refreshStore(userId: string, options?: { silent?: boolean }) {
  if (refreshPromise && refreshUserId === userId) return refreshPromise;
  if (!options?.silent) setState({ loading: true, error: null });

  refreshUserId = userId;
  const promise = (async () => {
    try {
      const habits = await refreshHabitViews(userId);
      if (state.userId === userId) setState({ habits, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载习惯失败";
      if (state.userId === userId) setState({ loading: false, error: message });
    } finally {
      if (refreshPromise === promise) {
        refreshPromise = null;
        refreshUserId = null;
      }
    }
  })();
  refreshPromise = promise;
  return refreshPromise;
}

export function useHabits() {
  const { userId } = useAppContext();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!userId) {
      setState({ userId: null, habits: [], loading: false, saving: false, error: null });
      return;
    }

    if (state.userId !== userId) {
      setState({ userId, habits: [], loading: true, saving: false, error: null });
    }
    let disposed = false;
    const reload = () => {
      if (!disposed) void loadLocal(userId);
    };
    const unsubscribe = subscribeHabitViews(userId, reload);

    void loadLocal(userId).then(() => {
      if (!disposed) void refreshStore(userId, { silent: true });
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [userId]);

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("请先登录");
    return userId;
  }, [userId]);

  const runMutation = useCallback(async (operation: (activeUserId: string) => Promise<unknown>) => {
    const activeUserId = requireUser();
    setState({ saving: true, error: null });
    try {
      await operation(activeUserId);
      await loadLocal(activeUserId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存习惯失败";
      setState({ error: message });
      throw error;
    } finally {
      if (state.userId === activeUserId) setState({ saving: false });
    }
  }, [requireUser]);

  const refresh = useCallback(async () => {
    await refreshStore(requireUser());
  }, [requireUser]);

  const createHabit = useCallback(
    async (input: CreateHabitInput) => {
      await runMutation((activeUserId) => createHabitLocal(activeUserId, input));
    },
    [runMutation],
  );

  const updateHabit = useCallback(
    async (habitId: number, input: UpdateHabitInput) => {
      await runMutation((activeUserId) => updateHabitLocal(activeUserId, habitId, input));
    },
    [runMutation],
  );

  const removeHabit = useCallback(
    async (habitId: number) => {
      await runMutation((activeUserId) => deleteHabitLocal(activeUserId, habitId));
    },
    [runMutation],
  );

  const toggleCheckin = useCallback(
    async (habit: HabitView, dateKey: string) => {
      const checked = !habit.checkins.some((checkin) => checkin.checked_on === dateKey);
      await runMutation((activeUserId) =>
        setHabitCheckinLocal(activeUserId, habit, dateKey, checked),
      );
    },
    [runMutation],
  );

  const checkinToday = useCallback(
    async (habit: HabitView) => {
      if (!habit.checkedToday) await toggleCheckin(habit, toDateKey());
    },
    [toggleCheckin],
  );

  return {
    habits: snapshot.userId === userId ? snapshot.habits : [],
    loading: snapshot.userId === userId ? snapshot.loading : Boolean(userId),
    saving: snapshot.userId === userId ? snapshot.saving : false,
    error: snapshot.userId === userId ? snapshot.error : null,
    refresh,
    createHabit,
    updateHabit,
    removeHabit,
    toggleCheckin,
    checkinToday,
  };
}
