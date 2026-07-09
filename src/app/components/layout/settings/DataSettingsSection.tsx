"use client";

import { useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import type {
  CompletedGoalRetention,
  UserPreferences,
} from "../../../../lib/profile/preferences";
import type {
  DeadOutboxDiagnostic,
  SyncStatus,
} from "../../../../lib/localDb/types";
import { Button } from "../../../../shared/components/ui/Button";
import { ConfirmDialog } from "../../../../shared/components/ui/ConfirmDialog";
import { useLanguage } from "../../../../shared/i18n/LanguageContext";
import { COMPLETED_GOAL_RETENTION_OPTIONS } from "./settingsOptions";
import { OptionGroup, PreferenceOptionCard } from "./PreferenceOptionCard";

type DataSettingsSectionProps = {
  preferences: UserPreferences;
  savingPreference: keyof UserPreferences | null;
  syncStatus: SyncStatus;
  deadOutboxCount: number;
  deadOutboxItems: DeadOutboxDiagnostic[];
  onCompletedGoalRetentionChange: (
    completedGoalRetention: CompletedGoalRetention,
  ) => void;
  onRetrySync: () => void | Promise<void>;
  onRetryDeadOutboxItem: (id: string) => void | Promise<void>;
  onDiscardDeadOutboxItem: (id: string) => void | Promise<void>;
  onCleanupOrphanedStorage: (id: string) => void | Promise<void>;
  onExport: () => void;
};

function formatDeadAt(value: string | undefined, language: "en" | "zh") {
  if (!value) return language === "en" ? "Unknown time" : "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === "en" ? "en-US" : "zh-CN", {
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
  deadOutboxCount,
  deadOutboxItems,
  onCompletedGoalRetentionChange,
  onRetrySync,
  onRetryDeadOutboxItem,
  onDiscardDeadOutboxItem,
  onCleanupOrphanedStorage,
  onExport,
}: DataSettingsSectionProps) {
  const { t, language } = useLanguage();
  const [discardTarget, setDiscardTarget] =
    useState<DeadOutboxDiagnostic | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const retryOne = async (id: string) => {
    setBusyItemId(id);
    try {
      await onRetryDeadOutboxItem(id);
    } finally {
      setBusyItemId(null);
    }
  };

  const discardOne = async () => {
    if (!discardTarget) return;
    setBusyItemId(discardTarget.id);
    try {
      await onDiscardDeadOutboxItem(discardTarget.id);
      setDiscardTarget(null);
    } finally {
      setBusyItemId(null);
    }
  };

  const cleanupOrphanedStorage = async (id: string) => {
    setBusyItemId(id);
    try {
      await onCleanupOrphanedStorage(id);
    } finally {
      setBusyItemId(null);
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

      <div className="mt-6 flex flex-wrap gap-3">
        {(syncStatus === "failed" || deadOutboxCount > 0) && (
          <>
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              {deadOutboxCount > 0
                ? language === "en"
                  ? `${deadOutboxCount} sync item${deadOutboxCount === 1 ? "" : "s"} need retry`
                  : `${deadOutboxCount} 条同步失败待重试`
                : t("syncFailed") || "同步失败"}
            </span>
            <Button variant="outline" onClick={() => void onRetrySync()}>
              <RefreshCw size={16} />
              {deadOutboxCount > 0
                ? language === "en"
                  ? "Retry all"
                  : "全部重试"
                : t("retry") || "重试"}
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={onExport}>
          <Download size={16} />
          {language === "en" ? "Export JSON" : "导出 JSON"}
        </Button>
      </div>

      {deadOutboxItems.length > 0 && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-red-800">
              {language === "en" ? "Sync diagnostics" : "同步诊断"}
            </h4>
            <span className="text-xs font-medium text-red-700">
              {deadOutboxItems.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {deadOutboxItems.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-red-100 bg-[var(--color-bg-surface)] p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-red-700">
                      <span>{item.collection}</span>
                      <span>{item.operation}</span>
                      {item.errorKind && <span>{item.errorKind}</span>}
                    </div>
                    <p className="mt-1 break-all text-sm font-medium text-[var(--color-text-primary)]">
                      {item.entityId}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                      {item.error ||
                        (language === "en"
                          ? "No error message recorded."
                          : "未记录错误信息。")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {language === "en" ? "Attempts" : "尝试次数"}:{" "}
                      {item.attemptCount ?? 0} ·{" "}
                      {formatDeadAt(item.deadAt, language)}
                    </p>
                    {item.orphanedStoragePath && (
                      <p className="mt-1 break-all text-xs text-red-700">
                        {language === "en" ? "Orphaned file" : "孤儿文件"}:{" "}
                        {item.orphanedStoragePath}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {item.orphanedStoragePath && (
                      <Button
                        variant="outline"
                        className="min-h-8 px-3 py-1 text-xs"
                        disabled={busyItemId === item.id}
                        onClick={() => void cleanupOrphanedStorage(item.id)}
                      >
                        <Trash2 size={14} />
                        {language === "en" ? "Clean file" : "清理文件"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="min-h-8 px-3 py-1 text-xs"
                      disabled={busyItemId === item.id}
                      onClick={() => void retryOne(item.id)}
                    >
                      <RefreshCw size={14} />
                      {t("retry") || "重试"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-8 px-3 py-1 text-xs text-red-700"
                      disabled={busyItemId === item.id}
                      onClick={() => setDiscardTarget(item)}
                    >
                      <Trash2 size={14} />
                      {language === "en" ? "Discard" : "丢弃"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={discardTarget !== null}
        title={language === "en" ? "Discard sync item?" : "丢弃同步项目？"}
        description={
          language === "en"
            ? "This removes only this dead-letter item from the local retry queue."
            : "这只会从本地重试队列移除此失败项目。"
        }
        confirmLabel={language === "en" ? "Discard" : "丢弃"}
        cancelLabel={t("cancel") || (language === "en" ? "Cancel" : "取消")}
        loading={discardTarget ? busyItemId === discardTarget.id : false}
        tone="danger"
        onConfirm={() => void discardOne()}
        onCancel={() => setDiscardTarget(null)}
      />
    </section>
  );
}
