"use client";

import { CalendarDays, CheckCircle2, Flame, Trash2 } from "lucide-react";
import { Button } from "../../../app/components/ui/Button";
import { formatDateKey } from "../../../lib/date/dateUtils";
import { useLanguage } from "../../../app/context/LanguageContext";
import type { HabitView } from "../types";

type HabitCardProps = {
  habit: HabitView;
  onOpen: (habit: HabitView) => void;
  onCheckinToday: (habit: HabitView) => Promise<void>;
  onDelete?: (habit: HabitView) => void;
};

export function HabitCard({ habit, onOpen, onCheckinToday, onDelete }: HabitCardProps) {
  const { t, language } = useLanguage();
  const frequencyLabel = habit.frequency === "daily" ? t("daily") || "每日" : t("weekly") || "每周";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(habit)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(habit);
      }}
      className="group w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-semibold text-[var(--color-text-primary)]">{habit.name}</h4>
            <span className="rounded-full bg-[var(--color-bg-surface)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
              {frequencyLabel}
            </span>
            {habit.checkedToday && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle2 size={12} />
                {t("checkedIn") || "已打卡"}
              </span>
            )}
          </div>

          {habit.description && (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{habit.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} />
              {t("checkinCount") || "打卡"} {habit.checkinCount} {t("times") || "次"}
            </span>
            {habit.frequency === "daily" && (
              <span className="inline-flex items-center gap-1">
                <Flame size={14} />
                {habit.streak} {language === "en" ? "day streak" : "天连续"}
              </span>
            )}
            {habit.lastCheckedOn && (
              <span>
                {t("lastCheckin") || "上次："}
                {formatDateKey(habit.lastCheckedOn, language)}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(habit);
              }}
              className="rounded-full p-2 text-[var(--color-text-secondary)] opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title={t("delete") || "删除"}
            >
              <Trash2 size={16} />
            </button>
          )}
          <div onClick={(event) => event.stopPropagation()}>
            <Button
              onClick={async () => {
                await onCheckinToday(habit);
              }}
              disabled={habit.checkedToday}
              className="h-9 whitespace-nowrap px-4 text-sm"
              variant={habit.checkedToday ? "ghost" : "primary"}
            >
              {habit.checkedToday ? t("checkedIn") || "已打卡" : t("checkin") || "打卡"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
