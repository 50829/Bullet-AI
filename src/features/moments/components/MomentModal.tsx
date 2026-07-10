"use client";
import React, { useEffect, useRef, useState } from "react";
import { DateField } from "../../../shared/components/date/DateField";
import { Button } from "../../../shared/components/ui/Button";
import { FieldLabel } from "../../../shared/components/ui/FieldLabel";
import { FormActions } from "../../../shared/components/ui/FormActions";
import { FormDialogShell } from "../../../shared/components/ui/FormDialogShell";
import { PlainImage } from "../../../shared/components/ui/PlainImage";
import { Textarea } from "../../../shared/components/ui/Textarea";
import { useToast } from "../../../shared/components/ui/Toast";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import {
  imageValidationMessage,
  validateImageBlob,
} from "../../../lib/media/imageValidation";
import { toDateKey } from "../../../lib/date/dateUtils";
import type {
  CreateMomentInput,
  MomentRecord,
  UpdateMomentInput,
} from "../types";

type MomentModalInitialMoment = Pick<
  MomentRecord,
  "clientId" | "content" | "occurredOn" | "imageUrl"
>;

type MomentModalCreateInput = CreateMomentInput;

type MomentModalUpdateInput = UpdateMomentInput;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (moment: MomentModalCreateInput) => Promise<void>;
  onUpdate: (
    clientId: string,
    updates: MomentModalUpdateInput,
  ) => Promise<void>;
  initialMoment?: MomentModalInitialMoment | null;
};

function toDateInputValue(value?: string) {
  return value || toDateKey();
}

export const MomentModal = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  initialMoment = null,
}: Props) => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const isEditing = Boolean(initialMoment);

  const setObjectPreview = (file: File | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!file) {
      setPreviewUrl(initialMoment?.imageUrl ?? null);
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
  };

  useEffect(() => {
    if (!isOpen) return;

    setContent(initialMoment?.content ?? "");
    setSelectedDate(toDateInputValue(initialMoment?.occurredOn));
    setImageFile(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(initialMoment?.imageUrl ?? null);
  }, [initialMoment, isOpen]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const resetForm = () => {
    setContent("");
    setImageFile(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedDate(toDateInputValue());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      showToast({
        type: "error",
        message: t("contentCannotBeEmpty") || "内容不能为空",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && initialMoment) {
        await onUpdate(initialMoment.clientId, {
          content,
          occurredOn: selectedDate,
          imageFile,
          imageFileName: imageFile?.name ?? null,
        });
      } else {
        await onCreate({
          content,
          occurredOn: selectedDate,
          imagePath: null,
          imageFile,
          imageFileName: imageFile?.name ?? null,
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
      title={isEditing ? t("edit") || "编辑" : t("newMoment") || "记录新时刻"}
      closeLabel={t("close") || "关闭"}
      modalClassName="max-w-xl"
      headerClassName="mb-4"
    >
      <div className="mb-4">
        <FieldLabel className="mb-1">{t("date") || "日期"}</FieldLabel>
        <DateField
          value={selectedDate}
          onChange={setSelectedDate}
          className="w-full"
        />
      </div>

      <div className="mb-4">
        <FieldLabel className="mb-1">{t("content") || "内容"}</FieldLabel>
        <Textarea
          placeholder={t("recordFeelings") || "记录这一刻的感受..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] h-auto"
        />
      </div>

      <div className="mt-3">
        <FieldLabel className="mb-1">
          {t("uploadImage") || "上传图片"}
        </FieldLabel>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (file) {
              const validation = validateImageBlob(file);
              if (!validation.ok) {
                e.target.value = "";
                setImageFile(null);
                setObjectPreview(null);
                showToast({
                  type: "error",
                  message: imageValidationMessage(validation.error, language),
                });
                return;
              }
            }

            setImageFile(file);
            setObjectPreview(file);
          }}
          className="block w-full rounded-lg border border-dashed border-[var(--color-border-muted)] p-3 text-sm text-[var(--color-text-secondary)]"
        />
        {previewUrl && (
          <PlainImage
            src={previewUrl}
            alt="preview"
            className="mt-3 w-48 h-48 object-cover rounded"
          />
        )}
      </div>

      <FormActions>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={saving}
          className="min-w-[60px] h-10"
        >
          {t("cancel") || "取消"}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="min-w-[60px] h-10"
        >
          {saving
            ? t("saving") || "保存中..."
            : isEditing
              ? t("update") || "更新"
              : t("save") || "记录"}
        </Button>
      </FormActions>
    </FormDialogShell>
  );
};
