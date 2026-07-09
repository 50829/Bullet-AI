"use client";

import { Download, RefreshCw } from "lucide-react";
import type {
  CompletedGoalRetention,
  UserPreferences,
} from "../../../../lib/profile/preferences";
import type { SyncStatus } from "../../../../lib/localDb/types";
import { Button } from "../../../../shared/components/ui/Button";
import { useLanguage } from "../../../../shared/i18n/LanguageContext";
import { COMPLETED_GOAL_RETENTION_OPTIONS } from "./settingsOptions";
import { OptionGroup, PreferenceOptionCard } from "./PreferenceOptionCard";

type DataSettingsSectionProps = {
  preferences: UserPreferences;
  savingPreference: keyof UserPreferences | null;
  syncStatus: SyncStatus;
  onCompletedGoalRetentionChange: (
    completedGoalRetention: CompletedGoalRetention,
  ) => void;
  onRetrySync: () => void | Promise<void>;
  onExport: () => void;
};

export function DataSettingsSection({
  preferences,
  savingPreference,
  syncStatus,
  onCompletedGoalRetentionChange,
  onRetrySync,
  onExport,
}: DataSettingsSectionProps) {
  const { t, language } = useLanguage();

  return (
    <section className="max-w-2xl">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
        {language === "en" ? "Data" : "数据"}
      </h3>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {language === "en" ? "Completed goals" : "完成目标"}
        </h4>
        <OptionGroup className="mt-3" columns="three">
          {COMPLETED_GOAL_RETENTION_OPTIONS.map((option) => (
            <PreferenceOptionCard
              key={option.id}
              selected={preferences.completed_goal_retention === option.id}
              label={language === "en" ? option.labelEn : option.labelZh}
              onClick={() => onCompletedGoalRetentionChange(option.id)}
              disabled={savingPreference === "completed_goal_retention"}
            />
          ))}
        </OptionGroup>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {syncStatus === "failed" && (
          <>
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              {t("syncFailed") || "同步失败"}
            </span>
            <Button variant="outline" onClick={() => void onRetrySync()}>
              <RefreshCw size={16} />
              {t("retry") || "重试"}
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={onExport}>
          <Download size={16} />
          {language === "en" ? "Export JSON" : "导出 JSON"}
        </Button>
      </div>
    </section>
  );
}
