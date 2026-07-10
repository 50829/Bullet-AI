"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { useLanguage } from "@/shared/i18n/LanguageContext";

export function PartialHistoryNotice({
  onRetry,
}: {
  onRetry: () => void | Promise<void>;
}) {
  const { language } = useLanguage();
  return (
    <div
      role="alert"
      className="mb-5 flex flex-col gap-3 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex items-start gap-2 text-sm">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <span>
          {language === "en"
            ? "Older cloud history could not be loaded. Recent records on this device are still available."
            : "较早的云端历史暂时无法加载，当前仍显示此设备上的近期记录。"}
        </span>
      </div>
      <Button variant="outline" onClick={() => void onRetry()}>
        <RefreshCw size={15} />
        {language === "en" ? "Retry" : "重试"}
      </Button>
    </div>
  );
}
