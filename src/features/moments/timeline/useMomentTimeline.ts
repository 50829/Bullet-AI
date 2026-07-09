import { useCallback, useMemo } from "react";
import type { MomentRecord as Moment } from "../types";

export type MomentDayCard = {
  date: string;
  moments: Moment[];
};

export type MomentMonthCard = {
  month: string;
  monthDisplay: string;
  dayCards: MomentDayCard[];
};

export function useMomentTimeline(moments: Moment[], language: "zh" | "en") {
  const getDateKey = useCallback((dateString: string): string => {
    if (dateString.includes("T")) return dateString.split("T")[0];

    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const formatMonthDisplay = useCallback(
    (monthKey: string) => {
      const [year, month] = monthKey.split("-");
      const monthIndex = Number(month) - 1;
      const date = new Date(Number(year), monthIndex, 1);

      if (language === "en") {
        return new Intl.DateTimeFormat("en", {
          month: "long",
          year: "numeric",
        }).format(date);
      }

      const monthLabel = new Intl.DateTimeFormat("zh-CN", {
        month: "long",
      }).format(date);
      return `${monthLabel} ${year}`;
    },
    [language],
  );

  const getDateFromKey = useCallback((dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, []);

  const formatDayNumber = useCallback(
    (dateKey: string) => String(getDateFromKey(dateKey).getDate()),
    [getDateFromKey],
  );

  const formatDayLabel = useCallback(
    (dateKey: string) => {
      const date = getDateFromKey(dateKey);
      if (language === "en") {
        return new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
        }).format(date);
      }

      return new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
      }).format(date);
    },
    [getDateFromKey, language],
  );

  const formatWeekday = useCallback(
    (dateKey: string) => {
      const locale = language === "en" ? "en" : "zh-CN";
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
        getDateFromKey(dateKey),
      );
    },
    [getDateFromKey, language],
  );

  const formatEntryTime = useCallback(
    (dateString: string) => {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return "";

      const locale = language === "en" ? "en" : "zh-CN";
      return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    },
    [language],
  );

  const formatEntryCount = useCallback(
    (count: number) => {
      if (language === "en")
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      return `${count}篇记录`;
    },
    [language],
  );

  const getMonthKey = useCallback(
    (dateString: string): string => getDateKey(dateString).substring(0, 7),
    [getDateKey],
  );

  const monthCards = useMemo(() => {
    const groupedByDate = new Map<string, Moment[]>();

    moments.forEach((moment) => {
      const dateKey = getDateKey(moment.created_at);
      const current = groupedByDate.get(dateKey) ?? [];
      current.push(moment);
      groupedByDate.set(dateKey, current);
    });

    const dayCards = Array.from(groupedByDate.entries())
      .map(([dateKey, items]) => ({
        date: dateKey,
        moments: items.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const groupedByMonth = new Map<string, MomentDayCard[]>();
    dayCards.forEach((dayCard) => {
      const monthKey = getMonthKey(dayCard.date);
      const current = groupedByMonth.get(monthKey) ?? [];
      current.push(dayCard);
      groupedByMonth.set(monthKey, current);
    });

    return Array.from(groupedByMonth.entries())
      .map(([monthKey, days]) => ({
        month: monthKey,
        monthDisplay: formatMonthDisplay(monthKey),
        dayCards: days.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.month + "-01").getTime() -
          new Date(a.month + "-01").getTime(),
      );
  }, [formatMonthDisplay, getDateKey, getMonthKey, moments]);

  return {
    monthCards,
    getMonthKey,
    formatDayNumber,
    formatDayLabel,
    formatWeekday,
    formatEntryTime,
    formatEntryCount,
  };
}
