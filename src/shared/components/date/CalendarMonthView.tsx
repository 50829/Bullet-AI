"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ResolvedWeekStartsOn } from "@/lib/profile/preferences";
import { buildCalendarGrid } from "@/lib/date/calendarGrid";
import {
  formatMonthLabel,
  getWeekdayLabels,
  isDateKeyWithinRange,
} from "@/lib/date/dateUtils";

export type CalendarMarker = {
  tone: "open" | "completed";
  label: string;
};

type CalendarMonthViewProps = {
  variant: "panel" | "popover";
  currentMonth: Date;
  selectedDateKey?: string | null;
  todayDateKey?: string;
  minDateKey?: string;
  maxDateKey?: string;
  locale: "zh" | "en";
  weekStartsOn: ResolvedWeekStartsOn;
  markersByDate?: Record<string, CalendarMarker[]>;
  className?: string;
  density?: "comfortable" | "compact";
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: Date, dateKey: string) => void;
};

const variantStyles = {
  panel: {
    root: "bg-[var(--color-panel-primary)] text-[var(--color-panel-text)]",
    navButton:
      "text-[var(--color-panel-text)] hover:bg-white/10 focus-visible:ring-[var(--color-panel-text)]",
    weekday: "text-[var(--color-panel-text)] opacity-80",
    dayBase: "hover:bg-white/10",
    normal: "text-[var(--color-panel-text)]",
    muted: "text-[var(--color-panel-text)] opacity-40",
    selected:
      "bg-white/15 text-[var(--color-panel-text)] ring-[var(--color-panel-text)] font-semibold opacity-100",
    today: "bg-white/10 text-[var(--color-panel-text)] font-semibold",
    focus: "focus-visible:ring-[var(--color-panel-text)]",
    completedDot: "bg-[var(--color-panel-text)]",
    openDot: "border border-[var(--color-panel-text)]",
  },
  popover: {
    root: "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
    navButton:
      "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] focus-visible:ring-[var(--color-primary)]",
    weekday: "text-[var(--color-text-secondary)]",
    dayBase: "hover:bg-[var(--color-bg-primary)]",
    normal: "text-[var(--color-text-primary)]",
    muted: "text-[var(--color-text-muted)]",
    selected:
      "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-[var(--color-primary)] font-semibold",
    today:
      "bg-[var(--color-primary-light)] text-[var(--color-text-primary)] font-semibold",
    focus: "focus-visible:ring-[var(--color-primary)]",
    completedDot: "bg-[var(--color-primary)]",
    openDot: "border border-[var(--color-primary)]",
  },
};

export function CalendarMonthView({
  variant,
  currentMonth,
  selectedDateKey = null,
  todayDateKey,
  minDateKey,
  maxDateKey,
  locale,
  weekStartsOn,
  markersByDate = {},
  className = "",
  density = "comfortable",
  onMonthChange,
  onSelectDate,
}: CalendarMonthViewProps) {
  const styles = variantStyles[variant];
  const calendarDays = buildCalendarGrid(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    weekStartsOn,
  );
  const weekDays = getWeekdayLabels(locale, weekStartsOn);
  const dateLocale = locale === "en" ? "en-US" : "zh-CN";

  const changeMonth = (amount: number) => {
    onMonthChange(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1),
    );
  };

  const compact = density === "compact";
  const headingClass = compact
    ? "text-lg font-semibold"
    : "text-xl font-semibold sm:text-2xl";
  const navButtonClass = compact ? "size-8" : "size-9";
  const weekdayClass = compact
    ? "py-0.5 text-xs font-semibold"
    : "py-1 text-sm font-medium sm:text-base";
  const gridGapClass = compact ? "gap-0.5" : "gap-1";
  const dayClass = compact
    ? "min-h-8 rounded-md p-0.5 text-sm"
    : "min-h-0 rounded-lg p-1 text-sm sm:text-base";

  return (
    <section className={`flex flex-col rounded-xl ${styles.root} ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-between ${
          compact ? "mb-2" : "mb-3"
        }`}
      >
        <h3 className={headingClass}>
          {formatMonthLabel(currentMonth, locale)}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className={`flex ${navButtonClass} items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${styles.navButton}`}
            aria-label={locale === "en" ? "Previous month" : "上个月"}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className={`flex ${navButtonClass} items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${styles.navButton}`}
            aria-label={locale === "en" ? "Next month" : "下个月"}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className={`mb-1 grid shrink-0 grid-cols-7 ${gridGapClass}`}>
        {weekDays.map((day) => (
          <div
            key={day}
            className={`text-center ${weekdayClass} ${styles.weekday}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className={`grid min-h-0 flex-1 grid-cols-7 grid-rows-6 ${gridGapClass}`}
      >
        {calendarDays.map(({ date, dateKey, isCurrentMonth }) => {
          const disabled = !isDateKeyWithinRange(
            dateKey,
            minDateKey,
            maxDateKey,
          );
          const selected = dateKey === selectedDateKey;
          const dayIsToday = dateKey === todayDateKey;
          const markers = markersByDate[dateKey] ?? [];
          const showMarkerRow = variant === "panel" || markers.length > 0;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!isCurrentMonth) {
                  onMonthChange(
                    new Date(date.getFullYear(), date.getMonth(), 1),
                  );
                }
                onSelectDate(date, dateKey);
              }}
              aria-label={date.toLocaleDateString(dateLocale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              aria-pressed={selected}
              className={`flex flex-col items-center justify-center gap-0.5 ${dayClass} ring-2 ring-inset ring-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none ${styles.dayBase} ${styles.focus} ${
                selected
                  ? styles.selected
                  : dayIsToday
                    ? styles.today
                    : isCurrentMonth
                      ? styles.normal
                      : styles.muted
              } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <span>{date.getDate()}</span>
              {showMarkerRow && (
                <span className="flex h-2 items-center justify-center gap-0.5">
                  {markers.slice(0, 3).map((marker, markerIndex) => (
                    <span
                      key={`${marker.label}-${markerIndex}`}
                      className={`h-1.5 w-1.5 rounded-full ${
                        marker.tone === "completed"
                          ? styles.completedDot
                          : styles.openDot
                      }`}
                      title={marker.label}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
