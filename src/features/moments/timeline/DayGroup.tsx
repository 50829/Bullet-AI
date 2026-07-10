"use client";

import type { MomentRecord as Moment } from "../types";
import type { MomentDayCard } from "./useMomentTimeline";
import { MomentEntryCard } from "./MomentEntryCard";

type DayGroupProps = {
  dayCard: MomentDayCard;
  activeHighlightMomentId: string | null;
  formatDayNumber: (dateKey: string) => string;
  formatDayLabel: (dateKey: string) => string;
  formatWeekday: (dateKey: string) => string;
  formatEntryCount: (count: number) => string;
  formatEntryTime: (dateString: string) => string;
  onEdit: (moment: Moment) => void;
  onDelete: (moment: Moment) => void;
};

export function DayGroup({
  dayCard,
  activeHighlightMomentId,
  formatDayNumber,
  formatDayLabel,
  formatWeekday,
  formatEntryCount,
  formatEntryTime,
  onEdit,
  onDelete,
}: DayGroupProps) {
  return (
    <article className="relative grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-5">
      <div className="relative z-10 flex min-h-12 items-center gap-3 rounded-lg bg-[var(--color-bg-primary)] text-left sm:flex-col sm:justify-start sm:gap-1 sm:px-2 sm:py-2">
        <span className="flex items-center gap-2 sm:flex-col sm:gap-0">
          <span className="text-3xl font-semibold leading-none text-[var(--color-text-primary)]">
            {formatDayNumber(dayCard.date)}
          </span>
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {formatWeekday(dayCard.date)}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[var(--color-text-secondary)] sm:hidden">
          <span className="truncate">{formatDayLabel(dayCard.date)}</span>
          <span>·</span>
          <span className="shrink-0">
            {formatEntryCount(dayCard.moments.length)}
          </span>
        </span>
      </div>

      <div className="min-w-0 space-y-3">
        <div
          className="hidden text-sm text-[var(--color-text-secondary)] sm:block"
          aria-hidden="true"
        >
          {formatDayLabel(dayCard.date)} ·{" "}
          {formatEntryCount(dayCard.moments.length)}
        </div>

        {dayCard.moments.map((moment) => (
          <MomentEntryCard
            key={moment.clientId}
            moment={moment}
            highlighted={moment.clientId === activeHighlightMomentId}
            entryTime={formatEntryTime(moment.createdAt)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </article>
  );
}
