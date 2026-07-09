import { toDateKey } from "./dateUtils";
import type { ResolvedWeekStartsOn } from "../profile/preferences";

export type CalendarGridDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
};

export function buildCalendarGrid(
  year: number,
  month: number,
  weekStartsOn: ResolvedWeekStartsOn = 0,
): CalendarGridDay[] {
  const monthStart = new Date(year, month, 1);
  const daysFromWeekStart = (monthStart.getDay() - weekStartsOn + 7) % 7;
  const gridStart = new Date(year, month, 1 - daysFromWeekStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );

    return {
      date,
      dateKey: toDateKey(date),
      isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
    };
  });
}
