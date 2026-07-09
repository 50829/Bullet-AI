"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { DateField } from "../../../app/components/date/DateField";
import { Button } from "../../../app/components/ui/Button";
import {
  formatDateKey,
  isDateKeyAfter,
  isDateKeyBefore,
  toDateKey,
} from "../../../lib/date/dateUtils";
import { useLanguage } from "../../../app/context/LanguageContext";
import type { HabitView } from "../types";

type HabitDetailDialogProps = {
  habit: HabitView | null;
  onClose: () => void;
  onToggleCheckin: (habit: HabitView, dateKey: string) => Promise<void>;
};

export function HabitDetailDialog({
  habit,
  onClose,
  onToggleCheckin,
}: HabitDetailDialogProps) {
  const { t, language } = useLanguage();
  const today = toDateKey();
  const [dateKey, setDateKey] = useState(today);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDateKey(today);
    setMessage(null);
  }, [habit?.id, today]);

  const createdOn = habit ? toDateKey(habit.created_at) : today;
  const checkedDateSet = useMemo(
    () => new Set(habit?.checkins.map((checkin) => checkin.checked_on) ?? []),
    [habit],
  );
  const isChecked = checkedDateSet.has(dateKey);
  const isBeforeCreated = isDateKeyBefore(dateKey, createdOn);
  const isFuture = isDateKeyAfter(dateKey, today);
  const canToggle = Boolean(habit) && !isBeforeCreated && !isFuture;
  const recentCheckins = habit?.checkins.slice(0, 12) ?? [];

  if (!habit) return null;

  const handleToggle = async () => {
    if (!canToggle) return;
    setSaving(true);
    setMessage(null);

    try {
      await onToggleCheckin(habit, dateKey);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : t("checkinFailed") || "打卡失败",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--color-bg-card)] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {habit.name}
            </h2>
            {habit.description && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {habit.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]"
            aria-label={t("close") || "关闭"}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[var(--color-bg-surface)] p-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("checkinCount") || "打卡次数"}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              {habit.checkinCount}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-surface)] p-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              {language === "en" ? "Current streak" : "当前连续"}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              {habit.frequency === "daily" ? habit.streak : "-"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-surface)] p-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("lastCheckin") || "上次打卡"}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
              {habit.lastCheckedOn
                ? formatDateKey(habit.lastCheckedOn, language)
                : "-"}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--color-border)] p-4">
          <label className="block text-sm font-medium text-[var(--color-text-primary)]">
            {language === "en" ? "Manage a check-in date" : "管理某一天的打卡"}
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <DateField
              value={dateKey}
              min={createdOn}
              max={today}
              onChange={setDateKey}
              className="flex-1"
            />
            <Button
              onClick={handleToggle}
              disabled={!canToggle || saving}
              className="min-h-10"
            >
              {isChecked
                ? language === "en"
                  ? "Undo"
                  : "撤销打卡"
                : t("checkin") || "打卡"}
            </Button>
          </div>
          {isBeforeCreated && (
            <p className="mt-2 text-sm text-red-500">
              {language === "en"
                ? "This date is before the habit was created."
                : "不能操作习惯创建日前的日期。"}
            </p>
          )}
          {isFuture && (
            <p className="mt-2 text-sm text-red-500">
              {language === "en"
                ? "Future dates cannot be checked in."
                : "不能提前给未来日期打卡。"}
            </p>
          )}
          {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {language === "en" ? "Recent check-ins" : "最近打卡"}
          </h3>
          {recentCheckins.length === 0 ? (
            <p className="mt-3 rounded-xl bg-[var(--color-bg-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
              {language === "en" ? "No check-ins yet." : "还没有打卡记录。"}
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {recentCheckins.map((checkin) => (
                <button
                  key={checkin.id}
                  type="button"
                  onClick={() => setDateKey(checkin.checked_on)}
                  className="rounded-full bg-[var(--color-bg-surface)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)]"
                >
                  {formatDateKey(checkin.checked_on, language)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
