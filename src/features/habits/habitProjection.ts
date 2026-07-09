import { addDays, toDateKey } from "../../lib/date/dateUtils";
import type { HabitCheckin, HabitRecord, HabitView } from "./types";

export function calculateDailyStreak(
  checkins: HabitCheckin[],
  today = toDateKey(),
) {
  const checkedDates = new Set(
    checkins
      .filter((checkin) => checkin.checked)
      .map((checkin) => checkin.checked_on),
  );
  let cursor = today;
  let streak = 0;

  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function projectHabit(
  habit: HabitRecord,
  allCheckins: HabitCheckin[],
  today = toDateKey(),
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
    checkins.find((checkin) => checkin.checked_on === today) ?? null;

  return {
    ...habit,
    checkedToday: Boolean(todayCheckin),
    todayCheckinId: todayCheckin?.id ?? null,
    checkinCount: checkins.length,
    lastCheckedOn: checkins[0]?.checked_on ?? null,
    streak:
      habit.frequency === "daily" ? calculateDailyStreak(checkins, today) : 0,
    checkins,
  };
}
