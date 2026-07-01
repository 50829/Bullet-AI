import { supabase } from "../../../lib/supabase/client";
import { addDays, toDateKey } from "../../../lib/date/dateUtils";
import { getLocalFirstRepository } from "../../../lib/localDb/localFirstRepository";
import { createClientId, subscribeCollection } from "../../../lib/localDb/repository";
import { flushOutbox } from "../../../lib/localDb/syncEngine";
import type {
  CreateHabitInput,
  HabitCheckin,
  HabitFrequency,
  HabitView,
  UpdateHabitInput,
} from "../types";

type HabitRecord = {
  id: number;
  client_id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  color: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  _local?: { pending?: boolean; failed?: boolean; deleted?: boolean };
};

const habitsRepository = getLocalFirstRepository<HabitRecord>("habits");
const checkinsRepository = getLocalFirstRepository<HabitCheckin>("habit_checkins");

function calculateDailyStreak(checkins: HabitCheckin[]) {
  const checkedDates = new Set(
    checkins.filter((checkin) => checkin.checked).map((checkin) => checkin.checked_on),
  );
  let cursor = toDateKey();
  let streak = 0;

  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function projectHabit(habit: HabitRecord, allCheckins: HabitCheckin[]): HabitView {
  const checkins = allCheckins
    .filter(
      (checkin) =>
        checkin.habit_client_id === habit.client_id &&
        checkin.checked &&
        !checkin.deleted_at,
    )
    .sort((a, b) => b.checked_on.localeCompare(a.checked_on));
  const todayCheckin = checkins.find((checkin) => checkin.checked_on === toDateKey()) ?? null;

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

export async function readHabitViews(userId: string) {
  const [habits, checkins] = await Promise.all([
    habitsRepository.list(userId),
    checkinsRepository.list(userId),
  ]);

  return habits
    .filter((habit) => !habit.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((habit) => projectHabit(habit, checkins));
}

export function subscribeHabitViews(userId: string, listener: () => void) {
  return subscribeCollection(userId, ["habits", "habit_checkins"], listener);
}

export async function refreshHabitViews(userId: string) {
  const [{ data: habitRows, error: habitError }, { data: checkinRows, error: checkinError }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("habit_checkins")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("checked_on", { ascending: false }),
    ]);

  if (habitError) throw new Error(habitError.message);
  if (checkinError) {
    const message = checkinError.message.toLowerCase();
    if (message.includes("habit_checkins") || checkinError.code === "PGRST205") {
      throw new Error(
        "数据库同步结构未更新，请执行 db/migrations/000_current_schema.sql。",
      );
    }
    throw new Error(checkinError.message);
  }

  await habitsRepository.replaceRemote(userId, (habitRows ?? []) as HabitRecord[]);
  await checkinsRepository.replaceRemote(userId, (checkinRows ?? []) as HabitCheckin[]);
  return readHabitViews(userId);
}

export async function createHabitLocal(userId: string, input: CreateHabitInput) {
  const now = new Date().toISOString();
  const habit: HabitRecord = {
    id: Date.now(),
    client_id: input.client_id ?? createClientId("habit"),
    user_id: userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    frequency: input.frequency,
    color: input.color ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await habitsRepository.mutate(userId, habit, "upsert");
  void flushOutbox();
  return habit;
}

export async function updateHabitLocal(userId: string, habitId: number, input: UpdateHabitInput) {
  const habits = await habitsRepository.list(userId);
  const current = habits.find((habit) => habit.id === habitId);
  if (!current) throw new Error("习惯不存在或已删除");

  const habit: HabitRecord = {
    ...current,
    name: typeof input.name === "string" ? input.name.trim() : current.name,
    description:
      typeof input.description === "string"
        ? input.description.trim() || null
        : current.description,
    frequency: input.frequency ?? current.frequency,
    color: "color" in input ? input.color ?? null : current.color,
    updated_at: new Date().toISOString(),
  };
  await habitsRepository.mutate(userId, habit, "update");
  void flushOutbox();
  return habit;
}

export async function deleteHabitLocal(userId: string, habitId: number) {
  const [habits, checkins] = await Promise.all([
    habitsRepository.list(userId),
    checkinsRepository.list(userId),
  ]);
  const habit = habits.find((item) => item.id === habitId);
  if (!habit) return;

  const related = checkins.filter((checkin) => checkin.habit_client_id === habit.client_id);
  await Promise.all(related.map((checkin) => checkinsRepository.remove(userId, checkin)));
  await habitsRepository.remove(userId, habit);
  void flushOutbox();
}

export async function setHabitCheckinLocal(
  userId: string,
  habit: HabitView,
  checkedOn: string,
  checked: boolean,
) {
  const createdOn = toDateKey(habit.created_at);
  const today = toDateKey();
  if (checkedOn < createdOn) throw new Error("不能给习惯创建日前的日期打卡");
  if (checkedOn > today) throw new Error("不能提前给未来日期打卡");

  const all = await checkinsRepository.list(userId);
  const clientId = `habit-checkin:${habit.client_id}:${checkedOn}`;
  const current = all.find((checkin) => checkin.client_id === clientId);
  const now = new Date().toISOString();
  const checkin: HabitCheckin = {
    id: current?.id ?? -Date.now(),
    client_id: clientId,
    user_id: userId,
    habit_id: current?.habit_id ?? null,
    habit_client_id: habit.client_id,
    checked_on: checkedOn,
    checked,
    created_at: current?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  };

  await checkinsRepository.mutate(userId, checkin, "upsert");
  void flushOutbox();
  return checkin;
}
