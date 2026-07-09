"use client";

import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useWorkspaceData } from "../../features/workspace/data";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useWorkspacePageLoading } from "../components/layout/WorkspaceNavigationContext";
import { Button } from "../../shared/components/ui/Button";
import { EmptyState } from "../../shared/components/ui/EmptyState";
import { LoadingState } from "../../shared/components/ui/LoadingState";
import { useToast } from "../../shared/components/ui/Toast";
import { useAssistantPanel } from "../hooks/useAssistantPanel";
import { useDeleteConfirm } from "../hooks/useDeleteConfirm";
import { useHighlightedSearchItem } from "../hooks/useHighlightedSearchItem";
import { ReflectionCard } from "../../features/reflections/components/ReflectionCard";
import type { ReflectionRecord as Reflection } from "../../features/reflections/types";

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
const ReflectionModal = dynamic(
  () =>
    import("../../features/reflections/components/ReflectionModal").then(
      (mod) => mod.ReflectionModal,
    ),
  { ssr: false },
);

export default function ReflectionsPageClient() {
  const {
    reflections,
    loading,
    refreshReflections,
    addReflection,
    updateReflection,
    deleteReflection,
  } = useWorkspaceData().reflections;
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(
    null,
  );
  const deleteConfirm = useDeleteConfirm();
  const [collapsedReflections, setCollapsedReflections] = useState<Set<number>>(
    new Set(),
  );

  const sortedReflections = useMemo(
    () =>
      [...reflections].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      ),
    [reflections],
  );

  const openNewReflection = useCallback(() => {
    setEditingReflection(null);
    setIsModalOpen(true);
  }, []);
  const topBarHandlers = useMemo(
    () => ({
      onAddReflection: openNewReflection,
    }),
    [openNewReflection],
  );
  const assistantPanel = useAssistantPanel(topBarHandlers);

  const toggleReflection = (reflectionId: number) => {
    setCollapsedReflections((current) => {
      const next = new Set(current);
      if (next.has(reflectionId)) next.delete(reflectionId);
      else next.add(reflectionId);
      return next;
    });
  };

  const getHighlightedReflectionId = useCallback(
    (reflection: Reflection) => reflection.id,
    [],
  );
  const getHighlightedReflectionGroup = useCallback(
    (reflection: Reflection) => reflection.id,
    [],
  );
  const getHighlightedReflectionElementId = useCallback(
    (itemId: number) => `reflection-${itemId}`,
    [],
  );
  const activeHighlightReflectionId = useHighlightedSearchItem<
    Reflection,
    number
  >({
    queryParam: searchParams.get("reflection"),
    items: reflections,
    getItemId: getHighlightedReflectionId,
    getGroupKey: getHighlightedReflectionGroup,
    setCollapsedGroups: setCollapsedReflections,
    getElementId: getHighlightedReflectionElementId,
  });

  const handleDelete = async () => {
    await deleteConfirm.confirm(async (target) => {
      try {
        await deleteReflection(target.id, target.imagePath);
      } catch (error) {
        showToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : t("deleteFailed") || "删除失败",
        });
        void refreshReflections();
        throw error;
      }
    });
  };

  const isInitialLoading = loading && reflections.length === 0;
  const isNavigationLoading = useWorkspacePageLoading(isInitialLoading);

  if (isInitialLoading) {
    return isNavigationLoading ? null : (
      <LoadingState className="min-h-[50dvh]" />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {assistantPanel.shouldRender && (
        <AssistantDrawer
          isOpen={assistantPanel.isOpen}
          onClose={assistantPanel.close}
          title={t("insights") || "感悟"}
          placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
          purpose="reflection_chat"
        />
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
            key={reflection.id}
            reflection={reflection}
            collapsed={collapsedReflections.has(reflection.id)}
            highlighted={reflection.id === activeHighlightReflectionId}
            onToggle={toggleReflection}
            onEdit={(target) => {
              setEditingReflection(target);
              setIsModalOpen(true);
            }}
            onDelete={(target) =>
              deleteConfirm.open({
                id: target.id,
                name:
                  target.title || target.content.slice(0, 42) || "reflection",
                imagePath: target.image_path,
              })
            }
          />
        ))
      )}

      {isModalOpen && (
        <ReflectionModal
          isOpen
          initialReflection={editingReflection}
          onClose={() => {
            setIsModalOpen(false);
            setEditingReflection(null);
          }}
          onSuccess={() => undefined}
          onCreate={addReflection}
          onUpdate={updateReflection}
        />
      )}
      {deleteConfirm.target && (
        <ConfirmDialog
          isOpen
          title={t("confirmDelete") || "确认删除这条感悟吗？"}
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
