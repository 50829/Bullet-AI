"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { FieldLabel } from "@/shared/components/ui/FieldLabel";
import { FormActions } from "@/shared/components/ui/FormActions";
import { FormDialogShell } from "@/shared/components/ui/FormDialogShell";
import { Input } from "@/shared/components/ui/Input";
import { Textarea } from "@/shared/components/ui/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import type {
  CreateReflectionInput,
  ReflectionRecord,
  UpdateReflectionInput,
} from "../types";

type ReflectionModalInitialReflection = Pick<
  ReflectionRecord,
  "clientId" | "title" | "body"
>;

type ReflectionModalCreateInput = CreateReflectionInput;

type ReflectionModalUpdateInput = UpdateReflectionInput;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (reflection: ReflectionModalCreateInput) => Promise<void>;
  onUpdate: (
    clientId: string,
    updates: ReflectionModalUpdateInput,
  ) => Promise<void>;
  initialReflection?: ReflectionModalInitialReflection | null;
};

export const ReflectionModal = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  initialReflection = null,
}: Props) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(initialReflection);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialReflection?.title ?? "");
    setBody(initialReflection?.body ?? "");
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

    setSaving(true);
    try {
      if (isEditing && initialReflection) {
        await onUpdate(initialReflection.clientId, {
          title: nextTitle,
          body: nextBody,
        });
      } else {
        await onCreate({
          title: nextTitle,
          body: nextBody,
        });
      }
      handleClose();
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
    <FormDialogShell
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isEditing
          ? t("editReflection") || "编辑感悟"
          : t("newReflection") || "记录新感悟"
      }
      closeLabel={t("close") || "关闭"}
      modalClassName="max-w-xl"
      panelClassName="w-full rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-6 shadow-xl"
      headerClassName="mb-4"
    >
      <FieldLabel>{t("title") || "标题"} *</FieldLabel>
      <Input
        className="mt-1"
        placeholder={t("enterTitle") || "输入标题（必填）"}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={100}
      />

      <FieldLabel className="mt-4">{t("content") || "内容"} *</FieldLabel>
      <Textarea
        className="mt-1 min-h-[180px]"
        placeholder={t("recordThoughts") || "记录你的思考和感悟..."}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />

      <FormActions>
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
      </FormActions>
    </FormDialogShell>
  );
};
