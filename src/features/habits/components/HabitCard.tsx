"use client";

import { CalendarDays, CheckCircle2, Edit2, Flame, Trash2 } from "lucide-react";
import { Button } from "../../../app/components/ui/Button";
import { formatDateKey } from "../../../lib/date/dateUtils";
import { useLanguage } from "../../../app/context/LanguageContext";
import type { HabitView } from "../types";

type HabitCardProps = {
  habit: HabitView;
  onOpen: (habit: HabitView) => void;
  onCheckinToday: (habit: HabitView) => Promise<void>;
  onEdit?: (habit: HabitView) => void;
  onDelete?: (habit: HabitView) => void;
};

export function HabitCard({ habit, onOpen, onCheckinToday, onEdit, onDelete }: HabitCardProps) {
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
      className="group w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left shadow-sm transition-shadow duration-150 hover:shadow-md motion-reduce:transition-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: habit.color || "var(--color-primary)" }}
            />
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
          {onEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(habit);
              }}
              className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
              title={t("edit") || "编辑"}
              aria-label={t("edit") || "编辑"}
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(habit);
              }}
              className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
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
