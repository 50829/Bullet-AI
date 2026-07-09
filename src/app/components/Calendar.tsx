"use client";

import { useMemo, useState } from "react";
import { CalendarMonthView } from "./date/CalendarMonthView";
import { useResolvedWeekStartsOn } from "./date/useResolvedWeekStartsOn";
import { toDateKey } from "../../lib/date/dateUtils";
import { useLanguage } from "../context/LanguageContext";
import type { GoalRecord } from "../../features/workspace/types";
import type { CalendarMarker } from "./date/CalendarMonthView";

type CalendarGoal = Pick<GoalRecord, "status" | "due_date">;

type CalendarProps = {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  goals: CalendarGoal[];
};

export const Calendar = ({
  selectedDate,
  onDateSelect,
  goals,
}: CalendarProps) => {
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
