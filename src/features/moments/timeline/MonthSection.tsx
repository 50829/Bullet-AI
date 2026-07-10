"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { MomentRecord as Moment } from "../types";
import type { MomentMonthCard } from "./useMomentTimeline";
import { DayGroup } from "./DayGroup";

type MonthSectionProps = {
  monthCard: MomentMonthCard;
  collapsed: boolean;
  activeHighlightMomentId: string | null;
  formatDayNumber: (dateKey: string) => string;
  formatDayLabel: (dateKey: string) => string;
  formatWeekday: (dateKey: string) => string;
  formatEntryCount: (count: number) => string;
  formatEntryTime: (dateString: string) => string;
  onToggle: (monthKey: string) => void;
  onEdit: (moment: Moment) => void;
  onDelete: (moment: Moment) => void;
};

export function MonthSection({
  monthCard,
  collapsed,
  activeHighlightMomentId,
  formatDayNumber,
  formatDayLabel,
  formatWeekday,
  formatEntryCount,
  formatEntryTime,
  onToggle,
  onEdit,
  onDelete,
}: MonthSectionProps) {
  const monthEntryCount = monthCard.dayCards.reduce(
    (count, dayCard) => count + dayCard.moments.length,
    0,
  );

  return (
    <section className="w-full" aria-labelledby={`month-${monthCard.month}`}>
      <button
        type="button"
        className="group flex w-full items-center gap-3 border-b border-[var(--color-border-muted)] pb-3 text-left transition-colors duration-150 hover:border-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 motion-reduce:transition-none"
        aria-expanded={!collapsed}
        aria-controls={`month-days-${monthCard.month}`}
        onClick={() => onToggle(monthCard.month)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 group-hover:bg-[var(--color-bg-surface)] group-hover:text-[var(--color-primary)] motion-reduce:transition-none">
          {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </span>
        <span className="min-w-0 flex-1">
          <span
            id={`month-${monthCard.month}`}
            className="block text-2xl font-semibold text-[var(--color-text-primary)]"
          >
            {monthCard.monthDisplay}
          </span>
          <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
            {formatEntryCount(monthEntryCount)}
          </span>
        </span>
      </button>

      {!collapsed && (
        <div
          id={`month-days-${monthCard.month}`}
          className="relative mt-5 space-y-7 sm:before:absolute sm:before:left-[41px] sm:before:top-1 sm:before:h-full sm:before:w-px sm:before:bg-[var(--color-border-muted)]"
        >
          {monthCard.dayCards.map((dayCard) => (
            <DayGroup
              key={dayCard.date}
              dayCard={dayCard}
              activeHighlightMomentId={activeHighlightMomentId}
              formatDayNumber={formatDayNumber}
              formatDayLabel={formatDayLabel}
              formatWeekday={formatWeekday}
              formatEntryCount={formatEntryCount}
              formatEntryTime={formatEntryTime}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
