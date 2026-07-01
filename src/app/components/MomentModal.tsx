"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Input } from "./ui/Input";
import { useLanguage } from '../context/LanguageContext';
import { useAppContext } from '../../context/AppContext';
import { useToast } from "./ui/Toast";
import { PlainImage } from "./ui/PlainImage";

type MomentDraft = {
  id: number;
  content: string;
  created_at: string;
  image_url?: string | null;
  image_path?: string | null;
};

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

export const MomentModal = ({ isOpen, onClose, onSuccess, initialMoment = null }: Props) => {
  const { t } = useLanguage();
  const { addMoment, updateMoment } = useAppContext();
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isEditing = Boolean(initialMoment);

  useEffect(() => {
    if (!isOpen) return;

    setContent(initialMoment?.content ?? "");
    setSelectedDate(toDateInputValue(initialMoment?.created_at));
    setImageFile(null);
    setPreviewUrl(initialMoment?.image_url ?? null);
  }, [initialMoment, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setContent("");
    setImageFile(null);
    setPreviewUrl(null);
    setSelectedDate(toDateInputValue());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!content.trim()) { 
      showToast({ type: "error", message: t("contentCannotBeEmpty") || "内容不能为空" }); 
      return; 
    }

    const dateISO = `${selectedDate}T00:00:00.000Z`;

    let localImageUrl: string | null = null;
    if (imageFile) {
      localImageUrl = URL.createObjectURL(imageFile);
    }

    try {
      if (isEditing && initialMoment) {
        await updateMoment(initialMoment.id, {
          content,
          created_at: dateISO,
          image_path: imageFile ? null : initialMoment.image_path ?? null,
          image_url: localImageUrl || previewUrl || initialMoment.image_url || null,
          local_file: imageFile,
          local_file_name: imageFile?.name ?? null,
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
          date: dateISO.split('T')[0],
        });
      }

      handleClose();
      onSuccess();
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : t("saveFailed") || "保存失败",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--color-bg-surface)] p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? t("edit") || "编辑" : t("newMoment") || "记录新时刻"}
        </h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">{t("date") || "日期"}</label>
          <Input 
            type="date"
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">{t("content") || "内容"}</label>
          <Textarea 
            placeholder={t("recordFeelings") || "记录这一刻的感受..."} 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            className="min-h-[120px] h-auto" 
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">{t("uploadImage") || "上传图片"}</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setImageFile(file);
              setPreviewUrl(file ? URL.createObjectURL(file) : initialMoment?.image_url ?? null);
            }} 
            className="block w-full rounded-lg border border-dashed border-[var(--color-border-muted)] p-3 text-sm text-[var(--color-text-secondary)]" 
          />
          {previewUrl && <PlainImage src={previewUrl} alt="preview" className="mt-3 w-48 h-48 object-cover rounded" />}
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <Button 
            variant="secondary" 
            onClick={handleClose} 
            className="min-w-[60px] h-10"
          >
            {t("cancel") || "取消"}
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="min-w-[60px] h-10"
          >
            {isEditing ? t("update") || "更新" : t("save") || "记录"}
          </Button>
        </div>
      </div>
    </div>
  );
};
