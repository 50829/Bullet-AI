import { toDateKey } from "./dateUtils";

export type CalendarGridDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
};

export function buildCalendarGrid(
  year: number,
  month: number,
): CalendarGridDay[] {
  const monthStart = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - monthStart.getDay());

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
