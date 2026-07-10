"use client";

import { Button } from "@/shared/components/ui/Button";
import { useLanguage } from "@/shared/i18n/LanguageContext";

export function HistoryLoadMoreButton({
  loading,
  onLoadMore,
}: {
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        disabled={loading}
        aria-busy={loading}
        onClick={() => void onLoadMore()}
      >
        {loading
          ? t("loadingEarlierRecords", "正在加载更早记录...")
          : t("loadEarlierRecords", "加载更早记录")}
      </Button>
    </div>
  );
}
