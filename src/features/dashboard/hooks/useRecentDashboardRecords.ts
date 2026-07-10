"use client";

import { useMemo } from "react";
import type { Language } from "../../../shared/i18n/LanguageContext";
import type { MomentRecord } from "../../moments/types";
import type { ReflectionRecord } from "../../reflections/types";

export type RecentDashboardItem = {
  id: string;
  kind: "moment" | "reflection";
  itemId: string;
  title: string;
  time: string;
  dateLabel: string;
};

function formatRecentItemDate(value: string, language: Language) {
  const dateKey = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return value;

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return value;

  const weekday = date.toLocaleDateString(
    language === "en" ? "en-US" : "zh-CN",
    { weekday: "short" },
  );
  return `${month}-${day} ${weekday}`;
}

export function buildRecentDashboardItems(
  moments: MomentRecord[],
  reflections: ReflectionRecord[],
  language: Language,
  newMomentLabel: string,
) {
  const momentItems = moments.map((moment) => ({
    id: `moment:${moment.clientId}`,
    kind: "moment" as const,
    itemId: moment.clientId,
    title: moment.content.slice(0, 42) || newMomentLabel,
    time: moment.updatedAt,
    dateLabel: formatRecentItemDate(moment.occurredOn, language),
  }));
  const reflectionItems = reflections.map((reflection) => ({
    id: `reflection:${reflection.clientId}`,
    kind: "reflection" as const,
    itemId: reflection.clientId,
    title: reflection.title || reflection.body.slice(0, 42),
    time: reflection.updatedAt,
    dateLabel: formatRecentItemDate(reflection.updatedAt, language),
  }));

  return [...momentItems, ...reflectionItems]
    .sort((left, right) => right.time.localeCompare(left.time))
    .slice(0, 5);
}

export function useRecentDashboardRecords({
  language,
  newMomentLabel,
  moments,
  reflections,
  loading = false,
}: {
  language: Language;
  newMomentLabel: string;
  moments: MomentRecord[];
  reflections: ReflectionRecord[];
  loading?: boolean;
}) {
  const items = useMemo(
    () =>
      buildRecentDashboardItems(moments, reflections, language, newMomentLabel),
    [language, moments, newMomentLabel, reflections],
  );

  return { items, loading };
}
