import { supabase } from "../../../lib/supabase/client";
import { addDays, toDateKey } from "../../../lib/date/dateUtils";
import type { CreateHabitInput, HabitCheckin, HabitFrequency, HabitView } from "../types";

type HabitRecord = {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  frequency: string | null;
  color: string | null;
  created_at: string;
};

const HABIT_CHECKINS_MIGRATION_MESSAGE =
  "数据库还没有 habit_checkins 表。请在 Supabase SQL Editor 执行 db/migrations/000_current_schema.sql。";

function isMissingHabitCheckinsTableError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (message.includes("habit_checkins") && message.includes("schema cache")) ||
    message.includes('relation "public.habit_checkins" does not exist')
  );
}

function normalizeFrequency(value: string | null | undefined): HabitFrequency {
  if (value === "weekly" || value === "Weekly" || value === "每周") return "weekly";
  return "daily";
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

function toHabitView(habit: HabitRecord, checkins: HabitCheckin[]): HabitView {
  const sortedCheckins = [...checkins].sort((a, b) => b.checked_on.localeCompare(a.checked_on));
  const today = toDateKey();
  const todayCheckin = sortedCheckins.find((checkin) => checkin.checked_on === today) ?? null;
  const frequency = normalizeFrequency(habit.frequency);

  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    frequency,
    color: habit.color,
    created_at: habit.created_at,
    checkedToday: Boolean(todayCheckin),
    todayCheckinId: todayCheckin?.id ?? null,
    checkinCount: sortedCheckins.length,
    lastCheckedOn: sortedCheckins[0]?.checked_on ?? null,
    streak: frequency === "daily" ? calculateDailyStreak(sortedCheckins) : 0,
    checkins: sortedCheckins,
  };
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("请先登录");

  return user;
}

export async function fetchHabitViews(): Promise<HabitView[]> {
  const user = await getCurrentUser();

  const { data: habits, error: habitError } = await supabase
    .from("habits")
    .select("id,user_id,name,description,frequency,color,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (habitError) throw new Error(habitError.message);
  if (!habits?.length) return [];

  const habitIds = habits.map((habit) => habit.id);
  const { data: checkins, error: checkinError } = await supabase
    .from("habit_checkins")
    .select("id,user_id,habit_id,checked_on,created_at")
    .eq("user_id", user.id)
    .in("habit_id", habitIds)
    .order("checked_on", { ascending: false });

  if (checkinError) {
    if (isMissingHabitCheckinsTableError(checkinError)) {
      console.warn(HABIT_CHECKINS_MIGRATION_MESSAGE);
      return habits.map((habit) => toHabitView(habit, []));
    }

    throw new Error(checkinError.message);
  }

  const checkinsByHabit = new Map<number, HabitCheckin[]>();
  (checkins ?? []).forEach((checkin) => {
    const habitCheckins = checkinsByHabit.get(checkin.habit_id) ?? [];
    habitCheckins.push(checkin);
    checkinsByHabit.set(checkin.habit_id, habitCheckins);
  });

  return habits.map((habit) => toHabitView(habit, checkinsByHabit.get(habit.id) ?? []));
}

export async function createHabit(input: CreateHabitInput) {
  const user = await getCurrentUser();
  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    frequency: input.frequency,
    color: input.color ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function deleteHabit(habitId: number) {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function toggleHabitCheckin(habit: HabitView, checkedOn: string) {
  const user = await getCurrentUser();
  const createdOn = toDateKey(habit.created_at);
  const today = toDateKey();

  if (checkedOn < createdOn) {
    throw new Error("不能给习惯创建日前的日期打卡");
  }

  if (checkedOn > today) {
    throw new Error("不能提前给未来日期打卡");
  }

  const existing = habit.checkins.find((checkin) => checkin.checked_on === checkedOn);

  if (existing) {
    const { error } = await supabase
      .from("habit_checkins")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      if (isMissingHabitCheckinsTableError(error)) {
        throw new Error(HABIT_CHECKINS_MIGRATION_MESSAGE);
      }

      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("habit_checkins").insert({
    user_id: user.id,
    habit_id: habit.id,
    checked_on: checkedOn,
  });

  if (error) {
    if (isMissingHabitCheckinsTableError(error)) {
      throw new Error(HABIT_CHECKINS_MIGRATION_MESSAGE);
    }

    if (error.code === "23505") {
      throw new Error("这一天已经打过卡了");
    }

    throw new Error(error.message);
  }
}
