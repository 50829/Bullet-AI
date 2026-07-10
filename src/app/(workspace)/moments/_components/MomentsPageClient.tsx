"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useWorkspaceMoments } from "@/features/workspace/providers";
import { useWorkspaceSessionContext } from "@/features/workspace/WorkspaceContext";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { useTopBar } from "@/app/(workspace)/_components/layout/TopBarContext";
import { HistoryLoadMoreButton } from "@/features/workspace/components/HistoryLoadMoreButton";
import { useToast } from "@/shared/components/ui/Toast";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { LoadingState } from "@/shared/components/ui/LoadingState";
import { useDeleteConfirm } from "@/app/(workspace)/_hooks/useDeleteConfirm";
import { MonthSection } from "@/features/moments/timeline/MonthSection";
import { useMomentTimeline } from "@/features/moments/timeline/useMomentTimeline";
import type { MomentRecord as Moment } from "@/features/moments/types";
import { PartialHistoryNotice } from "@/features/workspace/components/PartialHistoryNotice";
import { useDeferredHardDelete } from "@/features/workspace/hooks/useDeferredHardDelete";
import { UndoDeleteNotice } from "@/features/workspace/components/UndoDeleteNotice";
import { useHighlightedSearchItem } from "@/app/(workspace)/_hooks/useHighlightedSearchItem";

const getMomentId = (moment: Moment) => moment.clientId;
const getMomentElementId = (clientId: string) => `moment-${clientId}`;

const ConfirmDialog = dynamic(
  () =>
    import("@/shared/components/ui/ConfirmDialog").then(
      (mod) => mod.ConfirmDialog,
    ),
  { ssr: false },
);
const MomentModal = dynamic(
  () =>
    import("@/features/moments/components/MomentModal").then(
      (mod) => mod.MomentModal,
    ),
  { ssr: false },
);

export default function MomentsPageClient() {
  const session = useWorkspaceSessionContext();
  const momentsController = useWorkspaceMoments();
  const {
    moments,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    error: momentsError,
    refreshMoments,
    createMoment,
    updateMoment,
    deleteMoment,
  } = momentsController;
  const searchParams = useSearchParams();
  const highlightedMomentParam = searchParams.get("moment");
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const deleteConfirm = useDeleteConfirm();
  const deferredDelete = useDeferredHardDelete<{ id: string; name: string }>({
    onError: (error) => {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("deleteFailed") || "删除失败，请稍后重试",
      });
      void refreshMoments();
    },
  });
  const visibleMoments = useMemo(
    () =>
      moments.filter(
        (moment) => moment.clientId !== deferredDelete.pendingDelete?.id,
      ),
    [deferredDelete.pendingDelete?.id, moments],
  );
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(
    new Set(),
  );
  const {
    monthCards,
    getMonthKey,
    formatDayNumber,
    formatDayLabel,
    formatWeekday,
    formatEntryTime,
    formatEntryCount,
  } = useMomentTimeline(visibleMoments, language);
  const getMomentGroupKey = useCallback(
    (moment: Moment) => getMonthKey(moment.occurredOn),
    [getMonthKey],
  );
  const activeHighlightMomentId = useHighlightedSearchItem({
    targetId: highlightedMomentParam,
    items: visibleMoments,
    getItemId: getMomentId,
    getElementId: getMomentElementId,
    getGroupKey: getMomentGroupKey,
    setCollapsedGroups: setCollapsedMonths,
  });

  const handleAddMoment = useCallback(() => {
    setEditingMoment(null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    setTopBarHandlers({ onAddMoment: handleAddMoment });
    return () => setTopBarHandlers({});
  }, [handleAddMoment, setTopBarHandlers]);

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((current) => {
      const next = new Set(current);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMoment(null);
  };

  const handleDelete = async () => {
    await deleteConfirm.confirm(async (target) => {
      deferredDelete.scheduleDelete(target, () => deleteMoment(target.id));
    });
  };

  const isInitialLoading = (!session.ready || loading) && moments.length === 0;
  if (isInitialLoading) {
    return <LoadingState className="min-h-[50dvh]" />;
  }

  if (momentsError && moments.length === 0) {
    return (
      <EmptyState
        title={language === "en" ? "Failed to load moments" : "记录加载失败"}
        description={
          language === "en"
            ? "Check your connection and try again."
            : "请检查网络连接后重试。"
        }
        action={
          <Button onClick={() => void refreshMoments()}>
            {language === "en" ? "Retry" : "重试"}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <div className="px-0 pb-4">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-0">
            {momentsError && moments.length > 0 && (
              <PartialHistoryNotice onRetry={refreshMoments} />
            )}
            <div className="space-y-10">
              {monthCards.length === 0 ? (
                <EmptyState
                  title={t("noRecords") || "暂无记录"}
                  action={
                    <Button onClick={handleAddMoment}>
                      {t("newMoment") || "记录"}
                    </Button>
                  }
                />
              ) : (
                monthCards.map((monthCard) => (
                  <MonthSection
                    key={monthCard.month}
                    monthCard={monthCard}
                    collapsed={collapsedMonths.has(monthCard.month)}
                    activeHighlightMomentId={activeHighlightMomentId}
                    formatDayNumber={formatDayNumber}
                    formatDayLabel={formatDayLabel}
                    formatWeekday={formatWeekday}
                    formatEntryCount={formatEntryCount}
                    formatEntryTime={formatEntryTime}
                    onToggle={toggleMonth}
                    onEdit={(moment) => {
                      setEditingMoment(moment);
                      setIsModalOpen(true);
                    }}
                    onDelete={(moment) =>
                      deleteConfirm.open({
                        id: moment.clientId,
                        name: moment.content.slice(0, 42) || "moment",
                      })
                    }
                  />
                ))
              )}
              {hasMore && (
                <HistoryLoadMoreButton
                  loading={loadingMore}
                  onLoadMore={loadMore}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <MomentModal
          isOpen
          initialMoment={editingMoment}
          onClose={handleModalClose}
          onCreate={createMoment}
          onUpdate={updateMoment}
        />
      )}

      {deleteConfirm.target && (
        <ConfirmDialog
          isOpen
          title={t("confirmDelete") || "确认删除这条记录吗？"}
          description={
            language === "en"
              ? "You can undo this action for 5 seconds."
              : "删除后 5 秒内可以撤销。"
          }
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          loading={deleteConfirm.loading}
          tone="danger"
          onConfirm={handleDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}
      {deferredDelete.pendingDelete && (
        <UndoDeleteNotice
          itemName={deferredDelete.pendingDelete.name}
          onUndo={deferredDelete.undoDelete}
        />
      )}
    </div>
  );
}
