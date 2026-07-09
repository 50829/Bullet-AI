"use client";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { useLanguage } from "../context/LanguageContext";
import { useMomentsContext } from "../../features/workspace/WorkspaceContext";
import { useToast } from "./ui/Toast";
import { PlainImage } from "./ui/PlainImage";
import { Modal } from "./ui/Modal";
import { DateField } from "./date/DateField";
import type { MomentRecord } from "../../features/workspace/types";

type MomentDraft = Pick<
  MomentRecord,
  "id" | "content" | "created_at" | "image_url" | "image_path"
>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMoment?: MomentDraft | null;
};

function toDateInputValue(value?: string) {
  if (!value) return new Date().toISOString().split("T")[0];
  if (value.includes("T")) return value.split("T")[0];
  return value;
}

export const MomentModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialMoment = null,
}: Props) => {
  const { t } = useLanguage();
  const { addMoment, updateMoment } = useMomentsContext();
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const isEditing = Boolean(initialMoment);

  const setObjectPreview = (file: File | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!file) {
      setPreviewUrl(initialMoment?.image_url ?? null);
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
  };

  useEffect(() => {
    if (!isOpen) return;

    setContent(initialMoment?.content ?? "");
    setSelectedDate(toDateInputValue(initialMoment?.created_at));
    setImageFile(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(initialMoment?.image_url ?? null);
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

    const dateISO = `${selectedDate}T00:00:00.000Z`;

    const localImageUrl = objectUrlRef.current;

    try {
      if (isEditing && initialMoment) {
        await updateMoment(initialMoment.id, {
          content,
          created_at: dateISO,
          image_path: imageFile ? null : (initialMoment.image_path ?? null),
          image_url:
            localImageUrl || previewUrl || initialMoment.image_url || null,
          local_file: imageFile,
          local_file_name: imageFile?.name ?? null,
          previous_image_path: imageFile
            ? (initialMoment.image_path ?? null)
            : null,
        });
      } else {
        await addMoment({
          id: Date.now(),
          content,
          image_path: null,
          image_url: localImageUrl || previewUrl,
          local_file: imageFile,
          local_file_name: imageFile?.name ?? null,
          created_at: dateISO,
          date: dateISO.split("T")[0],
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
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-xl rounded-2xl bg-[var(--color-bg-surface)] p-6 shadow-xl"
    >
      <h2 className="text-2xl font-bold mb-4">
        {isEditing ? t("edit") || "编辑" : t("newMoment") || "记录新时刻"}
      </h2>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">
          {t("date") || "日期"}
        </label>
        <DateField
          value={selectedDate}
          onChange={setSelectedDate}
          className="w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">
          {t("content") || "内容"}
        </label>
        <Textarea
          placeholder={t("recordFeelings") || "记录这一刻的感受..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] h-auto"
        />
      </div>

      <div className="mt-3">
        <label className="block text-sm text-gray-600 mb-1">
          {t("uploadImage") || "上传图片"}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
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

      <div className="flex justify-end mt-6 space-x-3">
        <Button
          variant="secondary"
          onClick={handleClose}
          className="min-w-[60px] h-10"
        >
          {t("cancel") || "取消"}
        </Button>
        <Button onClick={handleSubmit} className="min-w-[60px] h-10">
          {isEditing ? t("update") || "更新" : t("save") || "记录"}
        </Button>
      </div>
    </Modal>
  );
};
