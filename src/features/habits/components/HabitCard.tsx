"use client";

import { CalendarDays, Check, Edit2, Flame, Trash2 } from "lucide-react";
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
  const checked = habit.checkedToday;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(habit)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(habit);
      }}
      className="group grid w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors duration-150 hover:bg-[var(--color-bg-primary)] motion-reduce:transition-none"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!checked) void onCheckinToday(habit);
        }}
        disabled={checked}
        title={checked ? t("checkedIn") || "已打卡" : t("checkin") || "打卡"}
        aria-label={checked ? t("checkedIn") || "已打卡" : t("checkin") || "打卡"}
        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none ${
          checked
            ? "cursor-default bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
            : "text-[var(--color-primary)] ring-2 ring-inset ring-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)]"
        }`}
      >
        <Check size={18} strokeWidth={2.5} />
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: habit.color || "var(--color-primary)" }}
          />
          <h4 className="truncate text-base font-semibold text-[var(--color-text-primary)]">{habit.name}</h4>
          <span className="rounded-full bg-[var(--color-bg-surface)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
            {frequencyLabel}
          </span>
        </div>

        {habit.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{habit.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
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

      <div className="flex shrink-0 items-center gap-1">
        {onEdit && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(habit);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-card)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
            title={t("edit") || "编辑"}
            aria-label={t("edit") || "编辑"}
          >
            <Edit2 size={18} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(habit);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
            title={t("delete") || "删除"}
            aria-label={t("delete") || "删除"}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
