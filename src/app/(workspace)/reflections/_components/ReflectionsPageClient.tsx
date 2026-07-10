"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useWorkspaceReflections } from "@/features/workspace/providers";
import { useWorkspaceSessionContext } from "@/features/workspace/WorkspaceContext";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { useTopBar } from "@/app/(workspace)/_components/layout/TopBarContext";
import { HistoryLoadMoreButton } from "@/features/workspace/components/HistoryLoadMoreButton";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { LoadingState } from "@/shared/components/ui/LoadingState";
import { useToast } from "@/shared/components/ui/Toast";
import { useDeleteConfirm } from "@/app/(workspace)/_hooks/useDeleteConfirm";
import { ReflectionCard } from "@/features/reflections/components/ReflectionCard";
import type { ReflectionRecord as Reflection } from "@/features/reflections/types";
import { PartialHistoryNotice } from "@/features/workspace/components/PartialHistoryNotice";
import { useDeferredHardDelete } from "@/features/workspace/hooks/useDeferredHardDelete";
import { UndoDeleteNotice } from "@/features/workspace/components/UndoDeleteNotice";
import { useHighlightedSearchItem } from "@/app/(workspace)/_hooks/useHighlightedSearchItem";

const getReflectionId = (reflection: Reflection) => reflection.clientId;
const getReflectionElementId = (clientId: string) => `reflection-${clientId}`;

const ConfirmDialog = dynamic(
  () =>
    import("@/shared/components/ui/ConfirmDialog").then(
      (mod) => mod.ConfirmDialog,
    ),
  { ssr: false },
);
const ReflectionModal = dynamic(
  () =>
    import("@/features/reflections/components/ReflectionModal").then(
      (mod) => mod.ReflectionModal,
    ),
  { ssr: false },
);

export default function ReflectionsPageClient() {
  const session = useWorkspaceSessionContext();
  const reflectionsController = useWorkspaceReflections();
  const {
    reflections,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    error: reflectionsError,
    refreshReflections,
    createReflection,
    updateReflection,
    deleteReflection,
  } = reflectionsController;
  const searchParams = useSearchParams();
  const highlightedReflectionParam = searchParams.get("reflection");
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(
    null,
  );
  const deleteConfirm = useDeleteConfirm();
  const deferredDelete = useDeferredHardDelete<{ id: string; name: string }>({
    onError: (error) => {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("deleteFailed") || "删除失败",
      });
      void refreshReflections();
    },
  });
  const [collapsedReflections, setCollapsedReflections] = useState<Set<string>>(
    new Set(),
  );
  const activeHighlightReflectionId = useHighlightedSearchItem({
    targetId: highlightedReflectionParam,
    items: reflections,
    getItemId: getReflectionId,
    getElementId: getReflectionElementId,
    getGroupKey: getReflectionId,
    setCollapsedGroups: setCollapsedReflections,
  });

  const sortedReflections = useMemo(
    () =>
      reflections
        .filter(
          (reflection) =>
            reflection.clientId !== deferredDelete.pendingDelete?.id,
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [deferredDelete.pendingDelete?.id, reflections],
  );

  const openNewReflection = useCallback(() => {
    setEditingReflection(null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    setTopBarHandlers({ onAddReflection: openNewReflection });
    return () => setTopBarHandlers({});
  }, [openNewReflection, setTopBarHandlers]);

  const toggleReflection = (clientId: string) => {
    setCollapsedReflections((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReflection(null);
  };

  const handleDelete = async () => {
    await deleteConfirm.confirm(async (target) => {
      deferredDelete.scheduleDelete(target, () => deleteReflection(target.id));
    });
  };

  const isInitialLoading =
    (!session.ready || loading) && reflections.length === 0;
  if (isInitialLoading) {
    return <LoadingState className="min-h-[50dvh]" />;
  }

  if (reflectionsError && reflections.length === 0) {
    return (
      <EmptyState
        title={
          language === "en" ? "Failed to load reflections" : "感悟加载失败"
        }
        description={
          language === "en"
            ? "Check your connection and try again."
            : "请检查网络连接后重试。"
        }
        action={
          <Button onClick={() => void refreshReflections()}>
            {language === "en" ? "Retry" : "重试"}
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {reflectionsError && reflections.length > 0 && (
        <PartialHistoryNotice onRetry={refreshReflections} />
      )}
      {sortedReflections.length === 0 ? (
        <EmptyState
          title={t("noRecords") || "暂无感悟"}
          action={
            <Button onClick={openNewReflection}>
              {t("newReflection") || "记录新感悟"}
            </Button>
          }
        />
      ) : (
        sortedReflections.map((reflection) => (
          <ReflectionCard
            key={reflection.clientId}
            reflection={reflection}
            collapsed={collapsedReflections.has(reflection.clientId)}
            highlighted={reflection.clientId === activeHighlightReflectionId}
            onToggle={toggleReflection}
            onEdit={(target) => {
              setEditingReflection(target);
              setIsModalOpen(true);
            }}
            onDelete={(target) =>
              deleteConfirm.open({
                id: target.clientId,
                name: target.title || target.body.slice(0, 42) || "reflection",
              })
            }
          />
        ))
      )}

      {hasMore && (
        <HistoryLoadMoreButton loading={loadingMore} onLoadMore={loadMore} />
      )}

      {isModalOpen && (
        <ReflectionModal
          isOpen
          initialReflection={editingReflection}
          onClose={closeModal}
          onCreate={createReflection}
          onUpdate={updateReflection}
        />
      )}
      {deleteConfirm.target && (
        <ConfirmDialog
          isOpen
          title={t("confirmDelete") || "确认删除这条感悟吗？"}
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
