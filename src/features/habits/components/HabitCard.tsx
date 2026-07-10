"use client";

import type { CSSProperties } from "react";
import { CalendarDays, Check, Edit2, Flame, Trash2 } from "lucide-react";
import { formatDateKey } from "@/lib/date/dateUtils";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { ActionButtonGroup } from "@/shared/components/ui/ActionButtonGroup";
import { IconButton } from "@/shared/components/ui/IconButton";
import type { HabitView } from "../types";

type HabitCardProps = {
  habit: HabitView;
  onOpen: (habit: HabitView) => void;
  onCheckinToday: (habit: HabitView) => Promise<void>;
  onEdit?: (habit: HabitView) => void;
  onDelete?: (habit: HabitView) => void;
};

export function HabitCard({
  habit,
  onOpen,
  onCheckinToday,
  onEdit,
  onDelete,
}: HabitCardProps) {
  const { t, language } = useLanguage();
  const frequencyLabel =
    habit.frequency === "daily" ? t("daily") || "每日" : t("weekly") || "每周";
  const checked = habit.isCurrentPeriodComplete;
  const accent = habit.color || "var(--color-primary)";

  return (
    <div className="group grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors duration-150 hover:bg-[var(--color-bg-primary)] motion-reduce:transition-none">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!checked) void onCheckinToday(habit);
        }}
        disabled={checked}
        style={{ "--habit-accent": accent } as CSSProperties}
        title={checked ? t("checkedIn") || "已打卡" : t("checkin") || "打卡"}
        aria-label={
          checked ? t("checkedIn") || "已打卡" : t("checkin") || "打卡"
        }
        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none ${
          checked
            ? "cursor-default bg-[var(--habit-accent)] text-[var(--color-text-on-primary)]"
            : "text-[var(--habit-accent)] ring-2 ring-inset ring-[var(--habit-accent)] hover:bg-[var(--habit-accent)] hover:text-[var(--color-text-on-primary)]"
        }`}
      >
        <Check size={18} strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={() => onOpen(habit)}
        className="min-w-0 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: habit.color || "var(--color-primary)" }}
          />
          <h4 className="truncate text-base font-semibold text-[var(--color-text-primary)]">
            {habit.name}
          </h4>
          <span className="rounded-full bg-[var(--color-bg-surface)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
            {frequencyLabel}
          </span>
        </div>

        {habit.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
            {habit.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} />
            {t("checkinCount") || "打卡"} {habit.checkinCount}{" "}
            {t("times") || "次"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame size={14} />
            {language === "en"
              ? `${habit.streak} ${habit.streakUnit}${habit.streak === 1 ? "" : "s"} streak`
              : `连续 ${habit.streak} ${habit.streakUnit === "week" ? "周" : "天"}`}
          </span>
          {habit.lastCheckedOn && (
            <span>
              {t("lastCheckin") || "上次："}
              {formatDateKey(habit.lastCheckedOn, language)}
            </span>
          )}
        </div>
      </button>

      <ActionButtonGroup
        variant="inline"
        visibility="always"
        className="shrink-0"
      >
        {onEdit && (
          <IconButton
            icon={<Edit2 size={18} />}
            label={t("edit") || "编辑"}
            tone="primary"
            stopPropagation
            onClick={() => onEdit(habit)}
          />
        )}
        {onDelete && (
          <IconButton
            icon={<Trash2 size={18} />}
            label={t("delete") || "删除"}
            tone="danger"
            stopPropagation
            onClick={() => onDelete(habit)}
          />
        )}
      </ActionButtonGroup>
    </div>
  );
}
