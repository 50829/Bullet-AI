"use client";

import { Clock3, Edit2 } from "lucide-react";
import type { RecentDashboardItem } from "../../../features/today/hooks/useTodayDashboard";
import { Button } from "../../../shared/components/ui/Button";
import { DashboardCardSection } from "../../../shared/components/ui/DashboardCardSection";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { LoadingState } from "../../../shared/components/ui/LoadingState";
import { useLanguage } from "../../../shared/i18n/LanguageContext";

type RecentRecordsSectionProps = {
  items: RecentDashboardItem[];
  loading?: boolean;
  onOpen: (item: RecentDashboardItem) => void;
  onNewMoment: () => void;
  onNewReflection: () => void;
};

export function RecentRecordsSection({
  items,
  loading = false,
  onOpen,
  onNewMoment,
  onNewReflection,
}: RecentRecordsSectionProps) {
  const { t } = useLanguage();

  return (
    <DashboardCardSection
      className="lg:col-span-3"
      title={t("recentRecords") || "最近更新"}
      action={
        <Button variant="outline" onClick={onNewReflection}>
          <Edit2 size={16} />
          {t("newReflection") || "感悟"}
        </Button>
      }
    >
      {loading && items.length === 0 ? (
        <LoadingState className="min-h-[180px]" />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("noRecords") || "暂无记录"}
          action={
            <Button onClick={onNewMoment}>{t("newMoment") || "记录"}</Button>
          }
        />
      ) : (
        <div className="divide-y divide-[var(--color-border-muted)]">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className="group grid min-h-[68px] w-full grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 enabled:hover:bg-[var(--color-bg-primary)] enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-[var(--color-primary)] disabled:cursor-default motion-reduce:transition-none"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <Clock3 size={18} strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--color-primary)]">
                  {item.dateLabel}
                </p>
                <p className="mt-1 line-clamp-2 text-base leading-6 text-[var(--color-text-primary)]">
                  {item.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </DashboardCardSection>
  );
}
