"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  GitMerge,
  Laptop,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { ConflictResolution } from "@/data";
import type {
  CompletedGoalRetention,
  UserPreferences,
} from "@/lib/profile/preferences";
import type { SyncIssue, SyncStatus } from "@/features/workspace/types";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { COMPLETED_GOAL_RETENTION_OPTIONS } from "./settingsOptions";
import { OptionGroup, PreferenceOptionCard } from "./PreferenceOptionCard";
import {
  chooseConflictValue,
  conflictFieldAllowsCustomValue,
  conflictFieldInput,
  conflictFieldLabel,
  conflictFields,
  conflictValidationMessage,
  createMergeDraft,
  draftInputValue,
  editConflictValue,
  formatConflictValue,
  validateConflictMerge,
  type ConflictMergeDraft,
} from "./conflictPresentation";

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
  onRetrySyncItem: (id: string) => void | Promise<void>;
  onDiscardSyncItem: (id: string) => void | Promise<void>;
  onResolveSyncConflict: (
    id: string,
    resolution: ConflictResolution,
  ) => void | Promise<void>;
  onExport: () => void | Promise<void>;
};

type ResolutionTarget = {
  issue: SyncIssue;
  resolution: ConflictResolution;
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
  onRetrySyncItem,
  onDiscardSyncItem,
  onResolveSyncConflict,
  onExport,
}: DataSettingsSectionProps) {
  const { language } = useLanguage();
  const [discardTarget, setDiscardTarget] = useState<SyncIssue | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expandedConflictId, setExpandedConflictId] = useState<string | null>(
    null,
  );
  const [mergeDrafts, setMergeDrafts] = useState<
    Record<string, ConflictMergeDraft>
  >({});
  const [resolutionTarget, setResolutionTarget] =
    useState<ResolutionTarget | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

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

  const retryOne = async (item: SyncIssue) => {
    setBusyItemId(item.id);
    try {
      await onRetrySyncItem(item.id);
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

  const toggleConflict = (issue: SyncIssue) => {
    if (!issue.conflict) return;
    setExpandedConflictId((current) =>
      current === issue.id ? null : issue.id,
    );
    setMergeDrafts((current) =>
      current[issue.id]
        ? current
        : { ...current, [issue.id]: createMergeDraft(issue.conflict!) },
    );
  };

  const resolveOne = async () => {
    if (!resolutionTarget) return;
    setBusyItemId(resolutionTarget.issue.id);
    setResolutionError(null);
    try {
      await onResolveSyncConflict(
        resolutionTarget.issue.id,
        resolutionTarget.resolution,
      );
      setExpandedConflictId(null);
      setResolutionTarget(null);
    } catch (error) {
      setResolutionError(
        error instanceof Error
          ? error.message
          : language === "en"
            ? "Could not resolve this conflict."
            : "无法处理这条冲突。",
      );
    } finally {
      setBusyItemId(null);
    }
  };

  const updateDraft = (
    issueId: string,
    update: (draft: ConflictMergeDraft) => ConflictMergeDraft,
  ) => {
    setMergeDrafts((current) => ({
      ...current,
      [issueId]: update(current[issueId] ?? {}),
    }));
  };

  const requestResolution = (target: ResolutionTarget) => {
    setResolutionError(null);
    setResolutionTarget(target);
  };

  const resolutionTitle = resolutionTarget
    ? resolutionTarget.issue.operation === "delete" &&
      !resolutionTarget.issue.conflict?.remote
      ? language === "en"
        ? "Finish deletion?"
        : "完成删除？"
      : resolutionTarget.issue.operation === "delete" &&
          resolutionTarget.resolution.action === "accept-remote"
        ? language === "en"
          ? "Cancel local deletion?"
          : "取消本地删除？"
        : resolutionTarget.issue.operation === "delete" &&
            resolutionTarget.resolution.action === "keep-local"
          ? language === "en"
            ? "Continue deleting?"
            : "继续删除？"
          : resolutionTarget.resolution.action === "accept-remote"
            ? language === "en"
              ? "Accept cloud version?"
              : "接受云端版本？"
            : resolutionTarget.resolution.action === "keep-local"
              ? language === "en"
                ? "Keep local version?"
                : "保留本地版本？"
              : language === "en"
                ? "Apply merged version?"
                : "应用合并版本？"
    : "";

  const resolutionDescription = resolutionTarget
    ? resolutionTarget.issue.operation === "delete" &&
      !resolutionTarget.issue.conflict?.remote
      ? language === "en"
        ? "The cloud record is already deleted. This clears the completed local operation."
        : "云端记录已经删除。此操作会清理已完成的本地删除任务。"
      : resolutionTarget.issue.operation === "delete" &&
          resolutionTarget.resolution.action === "accept-remote"
        ? language === "en"
          ? "The local deletion will be discarded and the current cloud record will remain."
          : "本地删除操作会被丢弃，当前云端记录将保留。"
        : resolutionTarget.issue.operation === "delete" &&
            resolutionTarget.resolution.action === "keep-local"
          ? language === "en"
            ? "The current cloud record will be permanently deleted."
            : "当前云端记录将被永久删除。"
          : resolutionTarget.resolution.action === "accept-remote"
            ? language === "en"
              ? "The local draft and its later local changes will be permanently discarded."
              : "本地草稿及其后续本地变更将被永久丢弃。"
            : resolutionTarget.resolution.action === "keep-local"
              ? language === "en"
                ? "The local change will be retried on the latest cloud version and may overwrite cloud fields."
                : "本地变更会基于最新云端版本重试，并可能覆盖云端字段。"
              : language === "en"
                ? "Your selected field values will be retried on the latest cloud version."
                : "你选择的字段值会基于最新云端版本重新同步。"
    : "";

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
            {syncIssues.map((item) => {
              const details = item.conflict;
              const expanded = expandedConflictId === item.id;
              const fields = details ? conflictFields(details) : [];
              const draft = mergeDrafts[item.id] ?? {
                values: {},
                sources: {},
              };
              const mergeValidation = details
                ? validateConflictMerge(details, draft)
                : null;
              return (
                <div
                  key={item.id}
                  className="border-b border-[var(--color-border-muted)] py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                    {details ? (
                      <Button
                        variant="outline"
                        className="shrink-0"
                        aria-expanded={expanded}
                        onClick={() => toggleConflict(item)}
                      >
                        {expanded ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                        {expanded
                          ? language === "en"
                            ? "Hide comparison"
                            : "收起对比"
                          : language === "en"
                            ? "Review conflict"
                            : "查看并处理"}
                      </Button>
                    ) : (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={busyItemId === item.id}
                          onClick={() => void retryOne(item)}
                        >
                          <RefreshCw size={15} />
                          {language === "en" ? "Retry" : "重试"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-[var(--color-danger)]"
                          disabled={busyItemId === item.id}
                          onClick={() => setDiscardTarget(item)}
                        >
                          <Trash2 size={15} />
                          {language === "en" ? "Discard local" : "丢弃本地变更"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {details && expanded && (
                    <div className="mt-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] p-3">
                      {!details.remote && item.operation === "delete" && (
                        <p className="mb-3 rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                          {language === "en"
                            ? "The cloud record is already deleted. Finish the deletion to clear this sync issue."
                            : "云端记录已经删除。完成删除即可清理这条同步问题。"}
                        </p>
                      )}
                      {!details.remote && item.operation !== "delete" && (
                        <p className="mb-3 rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                          {language === "en"
                            ? "The cloud record was deleted. Keeping your edit or applying a merge will restore a new copy."
                            : "云端记录已删除。保留本地编辑或应用合并结果会恢复一个新副本。"}
                        </p>
                      )}
                      {!(item.operation === "delete" && !details.remote) && (
                        <div className="space-y-3">
                          {fields.map((field) => {
                            const label = conflictFieldLabel(
                              field.key,
                              language,
                            );
                            const selected = draft.values[field.key];
                            const source = draft.sources[field.key];
                            const input = conflictFieldInput(field);
                            const validationError =
                              mergeValidation?.errors[field.key];
                            return (
                              <div
                                key={field.key}
                                className="rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                                    {label}
                                  </p>
                                  {field.differs && (
                                    <span className="text-[11px] font-medium text-[var(--color-danger)]">
                                      {language === "en"
                                        ? "Different"
                                        : "有差异"}
                                    </span>
                                  )}
                                  {field.changedLocally &&
                                    item.operation === "patch" && (
                                      <span className="text-[11px] font-medium text-[var(--color-primary)]">
                                        {language === "en"
                                          ? "Changed locally"
                                          : "本地已修改"}
                                      </span>
                                    )}
                                </div>
                                <div
                                  className="mt-2 grid gap-2 sm:grid-cols-2"
                                  role="group"
                                  aria-label={
                                    language === "en"
                                      ? `Choose ${label}`
                                      : `选择${label}`
                                  }
                                >
                                  <button
                                    type="button"
                                    className={`min-w-0 rounded-lg border p-2 text-left text-xs ${
                                      source === "local"
                                        ? "border-[var(--color-primary)] bg-[var(--color-bg-primary)]"
                                        : "border-[var(--color-border-muted)]"
                                    }`}
                                    aria-pressed={source === "local"}
                                    disabled={item.operation === "delete"}
                                    onClick={() =>
                                      updateDraft(item.id, (current) =>
                                        chooseConflictValue(
                                          current,
                                          field,
                                          "local",
                                        ),
                                      )
                                    }
                                  >
                                    <span className="flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
                                      <Laptop size={13} />
                                      {item.operation === "delete"
                                        ? language === "en"
                                          ? "Before deletion"
                                          : "删除前"
                                        : language === "en"
                                          ? "Local"
                                          : "本地"}
                                    </span>
                                    <span className="mt-1 block break-words text-[var(--color-text-secondary)]">
                                      {formatConflictValue(
                                        field.local,
                                        language,
                                        field.pendingBlob,
                                      )}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`min-w-0 rounded-lg border p-2 text-left text-xs ${
                                      source === "remote"
                                        ? "border-[var(--color-primary)] bg-[var(--color-bg-primary)]"
                                        : "border-[var(--color-border-muted)]"
                                    }`}
                                    aria-pressed={source === "remote"}
                                    disabled={
                                      item.operation === "delete" ||
                                      !details.remote
                                    }
                                    onClick={() =>
                                      updateDraft(item.id, (current) =>
                                        chooseConflictValue(
                                          current,
                                          field,
                                          "remote",
                                        ),
                                      )
                                    }
                                  >
                                    <span className="flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
                                      <Cloud size={13} />
                                      {language === "en" ? "Cloud" : "云端"}
                                    </span>
                                    <span className="mt-1 block break-words text-[var(--color-text-secondary)]">
                                      {formatConflictValue(
                                        field.remote,
                                        language,
                                      )}
                                    </span>
                                  </button>
                                </div>
                                {item.operation !== "delete" &&
                                  conflictFieldAllowsCustomValue(field) && (
                                    <label className="mt-2 block text-[11px] font-medium text-[var(--color-text-muted)]">
                                      {language === "en"
                                        ? "Merged value"
                                        : "合并后的值"}
                                      {input.kind === "multiline" ? (
                                        <textarea
                                          rows={2}
                                          className="mt-1 w-full rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)]"
                                          aria-label={
                                            language === "en"
                                              ? `Merged ${label}`
                                              : `合并后的${label}`
                                          }
                                          value={draftInputValue(selected)}
                                          onChange={(event) =>
                                            updateDraft(item.id, (current) =>
                                              editConflictValue(
                                                current,
                                                field.key,
                                                event.target.value,
                                              ),
                                            )
                                          }
                                        />
                                      ) : input.kind === "enum" ? (
                                        <select
                                          className="mt-1 w-full rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)]"
                                          aria-label={
                                            language === "en"
                                              ? `Merged ${label}`
                                              : `合并后的${label}`
                                          }
                                          value={draftInputValue(selected)}
                                          onChange={(event) =>
                                            updateDraft(item.id, (current) =>
                                              editConflictValue(
                                                current,
                                                field.key,
                                                event.target.value,
                                              ),
                                            )
                                          }
                                        >
                                          {input.options.map((option) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type={
                                            input.kind === "number"
                                              ? "number"
                                              : input.kind === "date"
                                                ? "date"
                                                : "text"
                                          }
                                          className="mt-1 w-full rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)]"
                                          aria-label={
                                            language === "en"
                                              ? `Merged ${label}`
                                              : `合并后的${label}`
                                          }
                                          value={draftInputValue(selected)}
                                          onChange={(event) =>
                                            updateDraft(item.id, (current) =>
                                              editConflictValue(
                                                current,
                                                field.key,
                                                event.target.value,
                                              ),
                                            )
                                          }
                                        />
                                      )}
                                    </label>
                                  )}
                                {validationError && (
                                  <p className="mt-1 text-xs text-[var(--color-danger)]">
                                    {conflictValidationMessage(
                                      validationError,
                                      language,
                                    )}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        {item.operation === "delete" && !details.remote ? (
                          <Button
                            disabled={busyItemId === item.id}
                            onClick={() =>
                              requestResolution({
                                issue: item,
                                resolution: { action: "keep-local" },
                              })
                            }
                          >
                            {language === "en" ? "Finish deletion" : "完成删除"}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              disabled={busyItemId === item.id}
                              onClick={() =>
                                requestResolution({
                                  issue: item,
                                  resolution: { action: "accept-remote" },
                                })
                              }
                            >
                              <Cloud size={15} />
                              {item.operation === "delete"
                                ? language === "en"
                                  ? "Cancel deletion"
                                  : "取消删除"
                                : !details.remote
                                  ? language === "en"
                                    ? "Accept deletion"
                                    : "接受删除"
                                  : language === "en"
                                    ? "Accept cloud"
                                    : "接受云端"}
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busyItemId === item.id}
                              onClick={() =>
                                requestResolution({
                                  issue: item,
                                  resolution: { action: "keep-local" },
                                })
                              }
                            >
                              <Laptop size={15} />
                              {item.operation === "delete"
                                ? language === "en"
                                  ? "Continue deletion"
                                  : "继续删除"
                                : language === "en"
                                  ? "Keep my edit"
                                  : "保留本地编辑"}
                            </Button>
                            {item.operation !== "delete" && (
                              <Button
                                disabled={
                                  busyItemId === item.id ||
                                  !mergeValidation?.valid
                                }
                                onClick={() =>
                                  requestResolution({
                                    issue: item,
                                    resolution: {
                                      action: "merge",
                                      changes:
                                        mergeValidation?.changes as never,
                                      fieldSources: draft.sources,
                                    },
                                  })
                                }
                              >
                                <GitMerge size={15} />
                                {language === "en"
                                  ? "Retry merged"
                                  : "合并后重试"}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
      <ConfirmDialog
        isOpen={resolutionTarget !== null}
        title={resolutionTitle}
        description={
          resolutionError
            ? `${resolutionDescription} ${
                language === "en" ? "Error:" : "错误："
              } ${resolutionError}`
            : resolutionDescription
        }
        confirmLabel={language === "en" ? "Continue" : "继续"}
        cancelLabel={language === "en" ? "Cancel" : "取消"}
        loading={
          resolutionTarget ? busyItemId === resolutionTarget.issue.id : false
        }
        tone={
          resolutionTarget &&
          ((resolutionTarget.issue.operation !== "delete" &&
            resolutionTarget.resolution.action === "accept-remote") ||
            (resolutionTarget.issue.operation === "delete" &&
              Boolean(resolutionTarget.issue.conflict?.remote) &&
              resolutionTarget.resolution.action === "keep-local"))
            ? "danger"
            : "default"
        }
        onConfirm={() => void resolveOne()}
        onCancel={() => {
          setResolutionTarget(null);
          setResolutionError(null);
        }}
      />
    </section>
  );
}
