"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from "../context/LanguageContext";
import { useTopBar } from "../components/layout/TopBar";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { useToast } from "../components/ui/Toast";
import { ReflectionModal, parseReflectionContent } from "../components/ReflectionModal";
import { AssistantDrawer } from "../components/AssistantDrawer";

type Reflection = {
  id: number;
  created_at: string;
  updated_at?: string;
  content: string;
  title?: string | null;
  body?: string | null;
  image_path?: string | null;
  _local?: { pending?: boolean; failed?: boolean };
};

export default function ReflectionsPageClient() {
  const { reflections, loading, refreshReflections, deleteReflection } = useAppContext();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [reflectionToDelete, setReflectionToDelete] = useState<Reflection | null>(null);
  const [deletingReflection, setDeletingReflection] = useState(false);
  const [collapsedReflections, setCollapsedReflections] = useState<Set<number>>(new Set());

  const sortedReflections = useMemo(
    () =>
      [...reflections].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      ),
    [reflections],
  );

  const openNewReflection = () => {
    setEditingReflection(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    setTopBarHandlers({
      onAddReflection: openNewReflection,
      onToggleAIPanel: () => setShowAIPanel(!showAIPanel),
      showAIPanel,
    });
  }, [setTopBarHandlers, showAIPanel]);

  const toggleReflection = (reflectionId: number) => {
    setCollapsedReflections((current) => {
      const next = new Set(current);
      if (next.has(reflectionId)) next.delete(reflectionId);
      else next.add(reflectionId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!reflectionToDelete) return;
    const target = reflectionToDelete;
    setDeletingReflection(true);

    try {
      await deleteReflection(target.id, target.image_path);
      showToast({ type: "success", message: t("deleteSuccess") || "删除成功" });
      setReflectionToDelete(null);
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : t("deleteFailed") || "删除失败",
      });
      void refreshReflections();
    } finally {
      setDeletingReflection(false);
    }
  };

  if (loading.reflections && reflections.length === 0) {
    return <LoadingState label={t("loadingReflectionsDetailed") || "思考即将开始..."} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <AssistantDrawer
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        title={t("aiThoughtAssistant") || "AI 思维助手"}
        placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
        greeting={t("aiThoughtAssistantGreeting") || "你好！我是你的 AI 思维助手。"}
        systemPrompt={
          language === "en"
            ? "You are a concise thinking partner. Help the user clarify reflections and turn vague thoughts into grounded observations."
            : "你是用户的思考伙伴。请帮助用户澄清感悟，把模糊想法整理成具体、温和、可继续行动的观察。"
        }
      />

      {sortedReflections.length === 0 ? (
        <EmptyState
          title={t("noRecords") || "暂无感悟"}
          description={t("recordThoughts") || "记录一个今天仍然值得回想的念头。"}
          action={<Button onClick={openNewReflection}>{t("newReflection") || "记录新感悟"}</Button>}
        />
      ) : (
        sortedReflections.map((reflection) => {
          const parsed = parseReflectionContent(reflection);
          const isCollapsed = collapsedReflections.has(reflection.id);

          return (
            <Card key={reflection.id} className="w-full">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleReflection(reflection.id)}
                  className="mt-1 rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)] motion-reduce:transition-none"
                  aria-label={isCollapsed ? "Expand reflection" : "Collapse reflection"}
                >
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                        {parsed.title || t("insights") || "感悟"}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {new Date(reflection.updated_at || reflection.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {reflection._local?.pending && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          {t("syncing") || "同步中"}
                        </span>
                      )}
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

      <ReflectionModal
        isOpen={isModalOpen}
        initialReflection={editingReflection}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReflection(null);
        }}
        onSuccess={() => undefined}
      />
      <ConfirmDialog
        isOpen={Boolean(reflectionToDelete)}
        title={t("confirmDelete") || "确认删除这条感悟吗？"}
        description={t("cannotRecover") || "删除后不可恢复"}
        confirmLabel={t("confirm") || "确认"}
        cancelLabel={t("cancel") || "取消"}
        loading={deletingReflection}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setReflectionToDelete(null)}
      />
    </div>
  );
}
