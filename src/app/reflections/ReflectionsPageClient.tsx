"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useReflectionsContext } from "../../features/workspace/WorkspaceContext";
import { useLanguage } from "../context/LanguageContext";
import { useTopBar } from "../components/layout/TopBar";
import { useWorkspacePageLoading } from "../components/layout/WorkspaceNavigationContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { useToast } from "../components/ui/Toast";
import { parseReflectionContent } from "../../lib/reflections/reflectionContent";
import type { ReflectionRecord as Reflection } from "../../features/workspace/types";

const AssistantDrawer = dynamic(
  () =>
    import("../components/AssistantDrawer").then((mod) => mod.AssistantDrawer),
  { ssr: false },
);
const ConfirmDialog = dynamic(
  () =>
    import("../components/ui/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false },
);
const ReflectionModal = dynamic(
  () =>
    import("../components/ReflectionModal").then((mod) => mod.ReflectionModal),
  { ssr: false },
);

export default function ReflectionsPageClient() {
  const { reflections, loading, refreshReflections, deleteReflection } =
    useReflectionsContext();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [hasOpenedAIPanel, setHasOpenedAIPanel] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(
    null,
  );
  const [reflectionToDelete, setReflectionToDelete] =
    useState<Reflection | null>(null);
  const [deletingReflection, setDeletingReflection] = useState(false);
  const [collapsedReflections, setCollapsedReflections] = useState<Set<number>>(
    new Set(),
  );
  const [activeHighlightReflectionId, setActiveHighlightReflectionId] =
    useState<number | null>(null);

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

  const toggleAIPanel = useCallback(() => {
    setHasOpenedAIPanel(true);
    setShowAIPanel((current) => !current);
  }, []);

  useEffect(() => {
    setTopBarHandlers({
      onAddReflection: openNewReflection,
      onToggleAIPanel: toggleAIPanel,
    });
  }, [openNewReflection, setTopBarHandlers, toggleAIPanel]);

  const toggleReflection = (reflectionId: number) => {
    setCollapsedReflections((current) => {
      const next = new Set(current);
      if (next.has(reflectionId)) next.delete(reflectionId);
      else next.add(reflectionId);
      return next;
    });
  };

  const highlightedReflectionParam = searchParams.get("reflection");
  const highlightedReflectionId = highlightedReflectionParam
    ? Number(highlightedReflectionParam)
    : null;

  useEffect(() => {
    if (!highlightedReflectionId || !Number.isFinite(highlightedReflectionId))
      return;
    if (
      !reflections.some(
        (reflection) => reflection.id === highlightedReflectionId,
      )
    )
      return;

    setCollapsedReflections((current) => {
      if (!current.has(highlightedReflectionId)) return current;
      const next = new Set(current);
      next.delete(highlightedReflectionId);
      return next;
    });
    setActiveHighlightReflectionId(highlightedReflectionId);

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`reflection-${highlightedReflectionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const highlightTimer = window.setTimeout(() => {
      setActiveHighlightReflectionId((current) =>
        current === highlightedReflectionId ? null : current,
      );
    }, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(highlightTimer);
    };
  }, [highlightedReflectionId, reflections]);

  const handleDelete = async () => {
    if (!reflectionToDelete) return;
    const target = reflectionToDelete;
    setDeletingReflection(true);

    try {
      await deleteReflection(target.id, target.image_path);
      setReflectionToDelete(null);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("deleteFailed") || "删除失败",
      });
      void refreshReflections();
    } finally {
      setDeletingReflection(false);
    }
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
      {hasOpenedAIPanel && (
        <AssistantDrawer
          isOpen={showAIPanel}
          onClose={() => setShowAIPanel(false)}
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
        sortedReflections.map((reflection) => {
          const parsed = parseReflectionContent(reflection);
          const isCollapsed = collapsedReflections.has(reflection.id);

          return (
            <Card
              key={reflection.id}
              id={`reflection-${reflection.id}`}
              className={`w-full transition-[background-color,box-shadow] duration-700 ease-out motion-reduce:transition-none ${
                reflection.id === activeHighlightReflectionId
                  ? "bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleReflection(reflection.id)}
                  className="mt-1 rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)] motion-reduce:transition-none"
                  aria-label={
                    isCollapsed ? "Expand reflection" : "Collapse reflection"
                  }
                >
                  {isCollapsed ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                        {parsed.title || t("insights") || "感悟"}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {new Date(
                          reflection.updated_at || reflection.created_at,
                        ).toLocaleString(language === "en" ? "en-US" : "zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {reflection._local?.failed && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                          {t("syncFailed") || "同步失败"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReflection(reflection);
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
                        title={t("edit") || "编辑"}
                        aria-label={t("edit") || "编辑"}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setReflectionToDelete(reflection)}
                        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
                        title={t("delete") || "删除"}
                        aria-label={t("delete") || "删除"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <p className="mt-4 whitespace-pre-line text-base leading-7 text-[var(--color-text-primary)]">
                      {parsed.body}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })
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
        />
      )}
      {reflectionToDelete && (
        <ConfirmDialog
          isOpen
          title={t("confirmDelete") || "确认删除这条感悟吗？"}
          description={t("cannotRecover") || "删除后不可恢复"}
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          loading={deletingReflection}
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => setReflectionToDelete(null)}
        />
      )}
    </div>
  );
}
