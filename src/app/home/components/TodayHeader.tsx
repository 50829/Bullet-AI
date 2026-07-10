"use client";

import { Plus, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "../../../shared/components/ui/Button";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import type { SyncStatus } from "../../../features/workspace/types";

type TodayHeaderProps = {
  syncStatus: SyncStatus;
  onRetrySync: () => void | Promise<void>;
  onNewMoment: () => void;
  onNewGoal: () => void;
};

export function TodayHeader({
  syncStatus,
  onRetrySync,
  onNewMoment,
  onNewGoal,
}: TodayHeaderProps) {
  const { t, language } = useLanguage();

  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          {language === "en" ? "Today" : "今天"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {new Date().toLocaleDateString(
            language === "en" ? "en-US" : "zh-CN",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            },
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {syncStatus === "failed" && (
          <>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              {t("syncFailed") || "同步失败"}
            </span>
            <Button variant="outline" onClick={() => void onRetrySync()}>
              <RefreshCw size={16} />
              {t("retry") || "重试"}
            </Button>
          </>
        )}
        {syncStatus === "offline" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
            <WifiOff size={14} />
            {language === "en" ? "Offline" : "离线"}
          </span>
        )}
        <Button variant="secondary" onClick={onNewMoment}>
          <Plus size={16} />
          {t("newMoment") || "记录"}
        </Button>
        <Button onClick={onNewGoal}>
          <Plus size={16} />
          {t("newGoal") || "目标"}
        </Button>
      </div>
    </section>
  );
}
