import { addDays, toDateKey } from "../../lib/date/dateUtils";
import type { ResolvedWeekStartsOn } from "../../lib/profile/preferences";
import type { HabitCheckin, HabitRecord, HabitView } from "./types";

export function calculateDailyStreak(
  checkins: HabitCheckin[],
  today = toDateKey(),
) {
  const checkedDates = new Set(checkins.map((checkin) => checkin.checkedOn));
  let cursor = checkedDates.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function startOfWeekKey(
  dateKey: string,
  weekStartsOn: ResolvedWeekStartsOn,
) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(dateKey, -offset);
}

export function calculateWeeklyStreak(
  checkins: HabitCheckin[],
  today = toDateKey(),
  weekStartsOn: ResolvedWeekStartsOn = 1,
) {
  const completedWeeks = new Set(
    checkins.map((checkin) => startOfWeekKey(checkin.checkedOn, weekStartsOn)),
  );
  const currentWeek = startOfWeekKey(today, weekStartsOn);
  let cursor = completedWeeks.has(currentWeek)
    ? currentWeek
    : addDays(currentWeek, -7);
  let streak = 0;

  while (completedWeeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function projectHabit(
  habit: HabitRecord,
  allCheckins: HabitCheckin[],
  today = toDateKey(),
  weekStartsOn: ResolvedWeekStartsOn = 1,
): HabitView {
  const rawCheckins = allCheckins
    .filter((checkin) => checkin.habitClientId === habit.clientId)
    .sort((a, b) => b.checkedOn.localeCompare(a.checkedOn));
  const weeklyCheckins = new Map<string, HabitCheckin>();
  rawCheckins.forEach((checkin) => {
    const period = startOfWeekKey(checkin.checkedOn, weekStartsOn);
    if (!weeklyCheckins.has(period)) weeklyCheckins.set(period, checkin);
  });
  const checkins =
    habit.frequency === "daily" ? rawCheckins : [...weeklyCheckins.values()];
  const currentPeriodStart = startOfWeekKey(today, weekStartsOn);
  const currentCheckin =
    checkins.find((checkin) =>
      habit.frequency === "daily"
        ? checkin.checkedOn === today
        : startOfWeekKey(checkin.checkedOn, weekStartsOn) ===
          currentPeriodStart,
    ) ?? null;

  return {
    ...habit,
    isCurrentPeriodComplete: Boolean(currentCheckin),
    currentPeriodCheckinId: currentCheckin?.clientId ?? null,
    checkinCount: checkins.length,
    lastCheckedOn: checkins[0]?.checkedOn ?? null,
    streak:
      habit.frequency === "daily"
        ? calculateDailyStreak(checkins, today)
        : calculateWeeklyStreak(checkins, today, weekStartsOn),
    streakUnit: habit.frequency === "daily" ? "day" : "week",
    checkins,
  };
}
