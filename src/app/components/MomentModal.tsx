// components/MomentModal.tsx
"use client";
import React, { useState } from "react";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Input } from "./ui/Input";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook
import { useAppContext } from '../../context/AppContext'; // 添加 AppContext
import { useToast } from "./ui/Toast";
import { PlainImage } from "./ui/PlainImage";

type Props = { isOpen: boolean; onClose: () => void; onSuccess: () => void; };

export const MomentModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { t } = useLanguage(); // 获取翻译函数
  const { addMoment } = useAppContext(); // 获取添加函数
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    // 默认使用今天的日期，格式为 YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim()) { 
      showToast({ type: "error", message: t("contentCannotBeEmpty") || "内容不能为空" }); 
      return; 
    }

    // 将选择的日期转换为 ISO 字符串，设置为 UTC 时间的当天 00:00:00
    const dateISO = `${selectedDate}T00:00:00.000Z`;

    // 如果有图片文件，创建本地预览 URL
    let localImageUrl: string | null = null;
    if (imageFile) {
      localImageUrl = URL.createObjectURL(imageFile);
    }

    // 创建临时 moment 对象（乐观更新）
    const tempMoment = {
      id: Date.now(), // 使用时间戳作为临时 ID
      content,
      image_path: null, // 暂时为 null,上传后更新
      image_url: localImageUrl || previewUrl, // 优先使用本地预览 URL
      local_file: imageFile,
      local_file_name: imageFile?.name ?? null,
      created_at: dateISO,
      date: dateISO.split('T')[0],
    };

    // 立即添加到列表（乐观更新）
    addMoment(tempMoment);

    // 立即关闭模态框并重置表单
    onClose();
    setContent(""); 
    setImageFile(null); 
    setPreviewUrl(null);
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);

    // 调用成功回调
    onSuccess();
    showToast({ type: "success", message: t("savedLocally") || "已在本地保存" });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--color-bg-surface)] p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">{t("newMoment") || "记录新时刻"}</h2>

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
              setPreviewUrl(file ? URL.createObjectURL(file) : null);
            }} 
            className="block w-full rounded-lg border border-dashed border-[var(--color-border-muted)] p-3 text-sm text-[var(--color-text-secondary)]" 
          />
          {previewUrl && <PlainImage src={previewUrl} alt="preview" className="mt-3 w-48 h-48 object-cover rounded" />}
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            className="min-w-[60px] h-10"
          >
            {t("cancel") || "取消"}
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="min-w-[60px] h-10"
          >
            {t("save") || "记录"}
          </Button>
        </div>
      </div>
    </div>
  );
};
