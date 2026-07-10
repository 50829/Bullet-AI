"use client";

import { useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import type {
  CompletedGoalRetention,
  UserPreferences,
} from "../../../../lib/profile/preferences";
import type {
  SyncIssue,
  SyncStatus,
} from "../../../../features/workspace/types";
import { Button } from "../../../../shared/components/ui/Button";
import { ConfirmDialog } from "../../../../shared/components/ui/ConfirmDialog";
import { useLanguage } from "../../../../shared/i18n/LanguageContext";
import { COMPLETED_GOAL_RETENTION_OPTIONS } from "./settingsOptions";
import { OptionGroup, PreferenceOptionCard } from "./PreferenceOptionCard";

type DataSettingsSectionProps = {
  preferences: UserPreferences;
  savingPreference: keyof UserPreferences | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  syncIssues: SyncIssue[];
  onCompletedGoalRetentionChange: (
    completedGoalRetention: CompletedGoalRetention,
  ) => void;
  onRetrySync: () => void | Promise<void>;
  onDiscardSyncItem: (id: string) => void | Promise<void>;
  onExport: () => void | Promise<void>;
};

function formatUpdatedAt(value: string, language: "en" | "zh") {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(language === "en" ? "en-US" : "zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function DataSettingsSection({
  preferences,
  savingPreference,
  syncStatus,
  pendingCount,
  syncIssues,
  onCompletedGoalRetentionChange,
  onRetrySync,
  onDiscardSyncItem,
  onExport,
}: DataSettingsSectionProps) {
  const { language } = useLanguage();
  const [discardTarget, setDiscardTarget] = useState<SyncIssue | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const discardOne = async () => {
    if (!discardTarget) return;
    setBusyItemId(discardTarget.id);
    try {
      await onDiscardSyncItem(discardTarget.id);
      setDiscardTarget(null);
    } finally {
      setBusyItemId(null);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {pendingCount > 0 && (
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            {language === "en"
              ? `${pendingCount} local change${pendingCount === 1 ? "" : "s"}`
              : `${pendingCount} 条本地变更待同步`}
          </span>
        )}
        {(syncStatus === "failed" || syncStatus === "offline") && (
          <Button variant="outline" onClick={() => void onRetrySync()}>
            <RefreshCw size={16} />
            {language === "en" ? "Retry sync" : "重试同步"}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => void exportData()}
          disabled={exporting}
        >
          <Download size={16} />
          {exporting
            ? language === "en"
              ? "Exporting..."
              : "导出中..."
            : language === "en"
              ? "Export JSON"
              : "导出 JSON"}
        </Button>
      </div>

      {syncIssues.length > 0 && (
        <div className="mt-5 border-t border-[var(--color-border-muted)] pt-4">
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {language === "en" ? "Changes needing attention" : "需要处理的变更"}
          </h4>
          <div className="mt-3 space-y-2">
            {syncIssues.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 border-b border-[var(--color-border-muted)] py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-[var(--color-danger)]">
                    {item.resource} · {item.operation} · {item.status}
                  </p>
                  <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">
                    {item.error ||
                      (language === "en"
                        ? "This local change conflicts with cloud data."
                        : "这条本地变更与云端数据冲突。")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {formatUpdatedAt(item.updatedAt, language)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0 text-[var(--color-danger)]"
                  disabled={busyItemId === item.id}
                  onClick={() => setDiscardTarget(item)}
                >
                  <Trash2 size={15} />
                  {language === "en" ? "Discard local" : "丢弃本地变更"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={discardTarget !== null}
        title={language === "en" ? "Discard local change?" : "丢弃本地变更？"}
        description={
          language === "en"
            ? "The cloud version will remain. This local draft cannot be restored."
            : "云端版本会保留，本地草稿将无法恢复。"
        }
        confirmLabel={language === "en" ? "Discard" : "丢弃"}
        cancelLabel={language === "en" ? "Cancel" : "取消"}
        loading={discardTarget ? busyItemId === discardTarget.id : false}
        tone="danger"
        onConfirm={() => void discardOne()}
        onCancel={() => setDiscardTarget(null)}
      />
    </section>
  );
}
