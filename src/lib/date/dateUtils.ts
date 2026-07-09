import type { ResolvedWeekStartsOn } from "../profile/preferences";

export function toDateKey(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function isDateKeyBefore(left: string, right: string) {
  return left < right;
}

export function isDateKeyAfter(left: string, right: string) {
  return left > right;
}

export function formatDateKey(dateKey: string, locale: "zh" | "en" = "zh") {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (locale === "en") {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return `${year}年${month}月${day}日`;
}

export function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isDateKeyWithinRange(
  dateKey: string,
  minDateKey?: string,
  maxDateKey?: string,
) {
  if (minDateKey && dateKey < minDateKey) return false;
  if (maxDateKey && dateKey > maxDateKey) return false;
  return true;
}

export function formatMonthLabel(date: Date, locale: "zh" | "en") {
  return date.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "long",
  });
}

export function formatDateButtonLabel(dateKey: string, locale: "zh" | "en") {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getWeekdayLabels(
  locale: "zh" | "en",
  weekStartsOn: ResolvedWeekStartsOn,
) {
  const labels =
    locale === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["日", "一", "二", "三", "四", "五", "六"];
  return [...labels.slice(weekStartsOn), ...labels.slice(0, weekStartsOn)];
}
