"use client";
import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useWorkspaceData } from "../../features/workspace/data";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useWorkspacePageLoading } from "../components/layout/WorkspaceNavigationContext";
import { useToast } from "../../shared/components/ui/Toast";
import { Button } from "../../shared/components/ui/Button";
import { EmptyState } from "../../shared/components/ui/EmptyState";
import { LoadingState } from "../../shared/components/ui/LoadingState";
import { useAssistantPanel } from "../hooks/useAssistantPanel";
import { useDeleteConfirm } from "../hooks/useDeleteConfirm";
import { useHighlightedSearchItem } from "../hooks/useHighlightedSearchItem";
import { MonthSection } from "../../features/moments/timeline/MonthSection";
import { useMomentTimeline } from "../../features/moments/timeline/useMomentTimeline";
import type { MomentRecord as Moment } from "../../features/moments/types";

const AssistantDrawer = dynamic(
  () =>
    import("../../features/ai/components/AssistantDrawer").then(
      (mod) => mod.AssistantDrawer,
    ),
  { ssr: false },
);
const ConfirmDialog = dynamic(
  () =>
    import("../../shared/components/ui/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false },
);
const MomentModal = dynamic(
  () =>
    import("../../features/moments/components/MomentModal").then(
      (mod) => mod.MomentModal,
    ),
  { ssr: false },
);

export default function MomentsPageClient() {
  const { moments, loading, refreshMoments, addMoment, updateMoment, deleteMoment } =
    useWorkspaceData().moments;
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const deleteConfirm = useDeleteConfirm();
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
  } = useMomentTimeline(moments, language);
  const getHighlightedMomentId = useCallback((moment: Moment) => moment.id, []);
  const getHighlightedMonthKey = useCallback(
    (moment: Moment) => getMonthKey(moment.created_at),
    [getMonthKey],
  );
  const getHighlightedElementId = useCallback(
    (itemId: number) => `moment-${itemId}`,
    [],
  );
  const activeHighlightMomentId = useHighlightedSearchItem<Moment, string>({
    queryParam: searchParams.get("moment"),
    items: moments,
    getItemId: getHighlightedMomentId,
    getGroupKey: getHighlightedMonthKey,
    setCollapsedGroups: setCollapsedMonths,
    getElementId: getHighlightedElementId,
  });

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const handleAddMoment = useCallback(() => {
    setEditingMoment(null);
    setIsModalOpen(true);
  }, []);
  const topBarHandlers = useMemo(
    () => ({
      onAddMoment: handleAddMoment,
    }),
    [handleAddMoment],
  );
  const assistantPanel = useAssistantPanel(topBarHandlers);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMoment(null);
  };
  const handleModalSuccess = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    await deleteConfirm.confirm(async (target) => {
      try {
        await deleteMoment(target.id, target.imagePath);
      } catch (err) {
        console.error("删除异常:", err);
        showToast({
          type: "error",
          message: t("deleteFailed") || "删除失败，请稍后重试",
        });
        void refreshMoments();
        throw err;
      }
    });
  };

  const isInitialLoading = loading && moments.length === 0;
  const isNavigationLoading = useWorkspacePageLoading(isInitialLoading);

  if (isInitialLoading) {
    return isNavigationLoading ? null : (
      <LoadingState className="min-h-[50dvh]" />
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {assistantPanel.shouldRender && (
        <AssistantDrawer
          isOpen={assistantPanel.isOpen}
          onClose={assistantPanel.close}
          title={t("moments") || "记录"}
          placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
          purpose="moment_chat"
        />
      )}

      <div className="flex-1">
        <div className="px-0 pb-4">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-0">
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
                        id: moment.id,
                        name: moment.content.slice(0, 42) || "moment",
                        imagePath: moment.image_path,
                      })
                    }
                  />
                ))
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
          onSuccess={handleModalSuccess}
          onCreate={addMoment}
          onUpdate={updateMoment}
        />
      )}

      {deleteConfirm.target && (
        <ConfirmDialog
          isOpen
          title={t("confirmDelete") || "确认删除这条记录吗？"}
          description={t("cannotRecover") || "删除后不可恢复"}
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          loading={deleteConfirm.loading}
          tone="danger"
          onConfirm={handleDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}
    </div>
  );
}
