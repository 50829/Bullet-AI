"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buildCalendarGrid } from "../../lib/date/calendarGrid";
import { toDateKey } from "../../lib/date/dateUtils";

type Goal = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  image_path?: string | null;
  status?: string;
  due_date?: string | null;
  progress?: number;
};

type CalendarProps = {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  goals: Goal[];
};

export const Calendar = ({
  selectedDate,
  onDateSelect,
  goals,
}: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const calendarDays = useMemo(
    () =>
      buildCalendarGrid(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth],
  );

  const goalDotsByDate = useMemo(() => {
    const counts = new Map<string, { open: number; completed: number }>();

    goals.forEach((goal) => {
      if (!goal.due_date) return;
      const current = counts.get(goal.due_date) ?? { open: 0, completed: 0 };
      if (goal.status === "completed") {
        current.completed += 1;
      } else {
        current.open += 1;
      }
      counts.set(goal.due_date, current);
    });

    return counts;
  }, [goals]);

  const getGoalDotsOnDate = (dateKey: string) => {
    const counts = goalDotsByDate.get(dateKey) ?? { open: 0, completed: 0 };
    const openDots = Math.min(counts.open, 3);
    const completedDots = Math.min(counts.completed, 3 - openDots);

    return [
      ...Array.from({ length: completedDots }, () => "completed" as const),
      ...Array.from({ length: openDots }, () => "open" as const),
    ];
  };

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  const handleDayClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    onDateSelect(date);
  };

  const prevMonth = () => {
    setCurrentMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1),
    );
  };

  const monthNames = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <section className="flex h-[400px] flex-col rounded-xl bg-[var(--color-panel-primary)] p-4 sm:h-[460px] lg:h-full">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h3 className="text-xl font-semibold text-[var(--color-panel-text)] sm:text-2xl">
          {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex size-9 items-center justify-center rounded-lg text-[var(--color-panel-text)] transition-colors hover:bg-black/10 motion-reduce:transition-none"
            aria-label="上个月"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex size-9 items-center justify-center rounded-lg text-[var(--color-panel-text)] transition-colors hover:bg-black/10 motion-reduce:transition-none"
            aria-label="下个月"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid shrink-0 grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-sm font-medium text-[var(--color-panel-text)] sm:text-base"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1">
        {calendarDays.map(({ date, dateKey, isCurrentMonth }) => {
          const goalDots = getGoalDotsOnDate(dateKey);
          const dayIsToday = dateKey === todayKey;
          const selected = dateKey === selectedDateKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleDayClick(date, isCurrentMonth)}
              aria-label={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
              aria-pressed={selected}
              className={`
                flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-lg p-1 text-sm text-[var(--color-panel-text)] transition-colors sm:text-base motion-reduce:transition-none
                ${isCurrentMonth ? "opacity-100" : "opacity-40"}
                ${selected ? "bg-white/15 ring-2 ring-inset ring-[var(--color-panel-text)]" : "ring-2 ring-inset ring-transparent"}
                ${dayIsToday && !selected ? "bg-white/10 font-semibold" : ""}
                ${dayIsToday && selected ? "font-semibold" : ""}
                hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-panel-text)]
              `}
            >
              <span>{date.getDate()}</span>
              <span className="flex h-2 items-center justify-center gap-0.5">
                {goalDots.map((dot, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={`h-1.5 w-1.5 rounded-full ${
                      dot === "completed"
                        ? "bg-[var(--color-panel-text)]"
                        : "border border-[var(--color-panel-text)]"
                    }`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
