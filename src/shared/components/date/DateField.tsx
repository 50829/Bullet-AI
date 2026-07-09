"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  formatDateButtonLabel,
  isDateKeyWithinRange,
  parseDateKey,
  toDateKey,
} from "../../../lib/date/dateUtils";
import { Button } from "../ui/Button";
import { CalendarMonthView } from "./CalendarMonthView";
import { useResolvedWeekStartsOn } from "./useResolvedWeekStartsOn";

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
  className?: string;
};

function getInitialMonth(value: string) {
  return parseDateKey(value) ?? new Date();
}

export function DateField({
  value,
  onChange,
  min,
  max,
  disabled = false,
  clearable = false,
  placeholder,
  className = "",
}: DateFieldProps) {
  const { language, t } = useLanguage();
  const weekStartsOn = useResolvedWeekStartsOn();
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() =>
    getInitialMonth(value),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const todayKey = toDateKey();
  const todayDisabled = !isDateKeyWithinRange(todayKey, min, max);

  useEffect(() => {
    const date = parseDateKey(value);
    if (!date) return;
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const displayValue = value
    ? formatDateButtonLabel(value, language)
    : placeholder || t("date") || "日期";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors duration-150 placeholder:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span
          className={
            value ? "truncate" : "truncate text-[var(--color-text-secondary)]"
          }
        >
          {displayValue}
        </span>
        <CalendarDays
          size={18}
          className="shrink-0 text-[var(--color-text-secondary)]"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[70] w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-lg">
          <CalendarMonthView
            variant="popover"
            density="compact"
            currentMonth={currentMonth}
            selectedDateKey={value || null}
            todayDateKey={todayKey}
            minDateKey={min}
            maxDateKey={max}
            locale={language}
            weekStartsOn={weekStartsOn}
            onMonthChange={setCurrentMonth}
            onSelectDate={(_, dateKey) => {
              onChange(dateKey);
              setOpen(false);
            }}
          />

          <div className="mt-2 flex justify-between gap-2">
            {clearable ? (
              <Button
                variant="ghost"
                className="min-h-8 px-3 py-1.5"
                disabled={!value}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {language === "en" ? "Clear" : "清除"}
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="ghost"
              className="min-h-8 px-3 py-1.5"
              disabled={todayDisabled}
              onClick={() => {
                onChange(todayKey);
                setCurrentMonth(new Date());
                setOpen(false);
              }}
            >
              {language === "en" ? "Today" : "今天"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
