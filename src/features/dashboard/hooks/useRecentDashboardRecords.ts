"use client";

import { useEffect, useState } from "react";
import { readRemoteCollectionPage } from "../../../lib/localDb/remoteReader";
import { logger } from "../../../lib/observability/logger";
import { parseReflectionContent } from "../../../lib/reflections/reflectionContent";
import type { Language } from "../../../shared/i18n/LanguageContext";
import type { MomentRecord } from "../../moments/types";
import type { ReflectionRecord } from "../../reflections/types";

export type RecentDashboardItem = {
  id: string;
  kind: "moment" | "reflection";
  itemId: number;
  title: string;
  time: string;
  dateLabel: string;
};

export function formatRecentItemDate(value: string, language: Language) {
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
  const momentItems = moments.slice(0, 4).map((moment) => ({
    id: `moment-${moment.id}`,
    kind: "moment" as const,
    itemId: moment.id,
    title: moment.content.slice(0, 42) || newMomentLabel,
    time: moment.created_at,
    dateLabel: formatRecentItemDate(moment.created_at, language),
  }));
  const reflectionItems = reflections.slice(0, 3).map((reflection) => {
    const parsed = parseReflectionContent(reflection);
    const time = reflection.updated_at || reflection.created_at;
    return {
      id: `reflection-${reflection.id}`,
      kind: "reflection" as const,
      itemId: reflection.id,
      title: parsed.title || parsed.body.slice(0, 42),
      time,
      dateLabel: formatRecentItemDate(time, language),
    };
  });

  return [...momentItems, ...reflectionItems]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);
}

export async function loadRecentDashboardItems(
  userId: string,
  language: Language,
  newMomentLabel: string,
) {
  const [momentsPage, reflectionsPage] = await Promise.all([
    readRemoteCollectionPage<MomentRecord>(
      userId,
      "moments",
      {
        limit: 4,
        offset: 0,
        includeSignedImageUrls: false,
      },
      { column: "created_at", ascending: false },
    ),
    readRemoteCollectionPage<ReflectionRecord>(
      userId,
      "reflections",
      {
        limit: 3,
        offset: 0,
        includeSignedImageUrls: false,
      },
      { column: "updated_at", ascending: false },
    ),
  ]);

  return buildRecentDashboardItems(
    momentsPage.items,
    reflectionsPage.items,
    language,
    newMomentLabel,
  );
}

export function useRecentDashboardRecords({
  userId,
  language,
  newMomentLabel,
  fallbackMoments,
  fallbackReflections,
}: {
  userId: string | null;
  language: Language;
  newMomentLabel: string;
  fallbackMoments?: MomentRecord[];
  fallbackReflections?: ReflectionRecord[];
}) {
  const [items, setItems] = useState<RecentDashboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fallbackItems = buildRecentDashboardItems(
      fallbackMoments ?? [],
      fallbackReflections ?? [],
      language,
      newMomentLabel,
    );

    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (fallbackItems.length > 0) setItems(fallbackItems);
    setLoading(true);
    void loadRecentDashboardItems(userId, language, newMomentLabel)
      .then((nextItems) => {
        if (!cancelled) setItems(nextItems);
      })
      .catch((error) => {
        logger.error("dashboard_recent_records_load_failed", {
          userId,
          error,
        });
        if (!cancelled) setItems(fallbackItems);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackMoments, fallbackReflections, language, newMomentLabel, userId]);

  return { items, loading };
}
