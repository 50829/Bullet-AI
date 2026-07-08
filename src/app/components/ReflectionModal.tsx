"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { useLanguage } from "../context/LanguageContext";
import { useReflectionsContext } from "../../features/workspace/WorkspaceContext";
import { useToast } from "./ui/Toast";
import { parseReflectionContent } from "../../lib/reflections/reflectionContent";
import { Modal } from "./ui/Modal";
import type { ReflectionRecord } from "../../features/workspace/types";

type ReflectionDraft = Pick<
  ReflectionRecord,
  "id" | "content" | "title" | "body" | "created_at"
>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialReflection?: ReflectionDraft | null;
};

export const ReflectionModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialReflection = null,
}: Props) => {
  const { t } = useLanguage();
  const { addReflection, updateReflection } = useReflectionsContext();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(initialReflection);

  useEffect(() => {
    if (!isOpen) return;
    const parsed = initialReflection
      ? parseReflectionContent(initialReflection)
      : { title: "", body: "" };
    setTitle(parsed.title);
    setBody(parsed.body);
  }, [initialReflection, isOpen]);

  if (!isOpen) return null;

  const reset = () => {
    setTitle("");
    setBody("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast({
        type: "error",
        message: t("pleaseEnterTitle") || "请填写标题",
      });
      return;
    }

    if (!body.trim()) {
      showToast({
        type: "error",
        message: t("pleaseEnterContent") || "请填写感悟内容",
      });
      return;
    }

    const nextTitle = title.trim();
    const nextBody = body.trim();
    const content = `${nextTitle}\n\n${nextBody}`;

    setSaving(true);
    try {
      if (isEditing && initialReflection) {
        await updateReflection(initialReflection.id, {
          title: nextTitle,
          body: nextBody,
          content,
        });
      } else {
        await addReflection({
          id: Date.now(),
          title: nextTitle,
          body: nextBody,
          content,
          created_at: new Date().toISOString(),
          source: null,
          source_type: null,
          location: null,
          image_url: null,
          image_path: null,
        });
      }
      handleClose();
      onSuccess();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("saveFailed") || "保存失败",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-xl rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-6 shadow-xl"
    >
      <h2 className="mb-4 text-2xl font-bold text-[var(--color-text-primary)]">
        {isEditing
          ? t("editReflection") || "编辑感悟"
          : t("newReflection") || "记录新感悟"}
      </h2>

      <label className="block text-sm text-[var(--color-text-secondary)]">
        {t("title") || "标题"} *
      </label>
      <Input
        className="mt-1"
        placeholder={t("enterTitle") || "输入标题（必填）"}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={100}
      />

      <label className="mt-4 block text-sm text-[var(--color-text-secondary)]">
        {t("content") || "内容"} *
      </label>
      <Textarea
        className="mt-1 min-h-[180px]"
        placeholder={t("recordThoughts") || "记录你的思考和感悟..."}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={handleClose} disabled={saving}>
          {t("cancel") || "取消"}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !title.trim() || !body.trim()}
        >
          {saving
            ? t("saving") || "保存中..."
            : isEditing
              ? t("update") || "更新"
              : t("save") || "保存"}
        </Button>
      </div>
    </Modal>
  );
};
