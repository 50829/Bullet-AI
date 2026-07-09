"use client";

import { useMemo, useState } from "react";
import { CalendarMonthView } from "../../../shared/components/date/CalendarMonthView";
import { useResolvedWeekStartsOn } from "../../../shared/components/date/useResolvedWeekStartsOn";
import type { CalendarMarker } from "../../../shared/components/date/CalendarMonthView";
import { toDateKey } from "../../../lib/date/dateUtils";
import { useLanguage } from "../../../shared/i18n/LanguageContext";

type GoalCalendarGoal = {
  status?: string | null;
  due_date?: string | null;
};

type GoalCalendarProps = {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  goals: GoalCalendarGoal[];
};

export const GoalCalendar = ({
  selectedDate,
  onDateSelect,
  goals,
}: GoalCalendarProps) => {
  const { language } = useLanguage();
  const weekStartsOn = useResolvedWeekStartsOn();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const todayKey = useMemo(() => toDateKey(), []);
  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  const markersByDate = useMemo(() => {
    const markers = new Map<string, CalendarMarker[]>();

    goals.forEach((goal) => {
      if (!goal.due_date) return;
      const current = markers.get(goal.due_date) ?? [];
      current.push({
        tone: goal.status === "completed" ? "completed" : "open",
        label: goal.status === "completed" ? "completed" : "open",
      });
      markers.set(goal.due_date, current.slice(0, 3));
    });

    return Object.fromEntries(markers);
  }, [goals]);

  return (
    <CalendarMonthView
      variant="panel"
      className="h-[400px] p-4 sm:h-[460px] lg:h-full"
      currentMonth={currentMonth}
      selectedDateKey={selectedDateKey}
      todayDateKey={todayKey}
      locale={language}
      weekStartsOn={weekStartsOn}
      markersByDate={markersByDate}
      onMonthChange={setCurrentMonth}
      onSelectDate={(date) => onDateSelect(date)}
    />
  );
};
