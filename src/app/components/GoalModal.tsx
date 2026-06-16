// components/GoalModal.tsx
"use client";
import React, { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { useLanguage } from '../context/LanguageContext'; // 添加语言Hook
import { createGoal } from "../../features/goals/services/goalService";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const GoalModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { t } = useLanguage(); // 获取翻译函数
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim()) return alert(t("pleaseEnterTitle") || "请填写目标标题");

    setLoading(true);

    try {
      await createGoal({
        title,
        description,
        dueDate: null,
      });
      setLoading(false);
      onSuccess();
      onClose();
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("捕获到异常:", err);
      setLoading(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`${t("saveFailed") || "保存失败，请重试"}: ${errorMsg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="rounded-[28px] p-6 w-full max-w-md shadow-xl transform transition-transform duration-200" style={{ backgroundColor: 'var(--color-modal-card, #efeeeb)' }}>
        <h2 className="text-2xl font-bold mb-4">{t("newGoal") || "新建目标"}</h2>

        <label className="block text-sm text-gray-600 mb-1">
          {t("title") || "标题 *"}
          <span className="text-gray-400 ml-2 text-xs">({title.length}/30)</span>
        </label>
        <Input
          placeholder={t("enterGoal") || "输入目标..."}
          value={title}
          onChange={(e) => {
            if (e.target.value.length <= 30) {
              setTitle(e.target.value);
            }
          }}
          maxLength={30}
        />

        <label className="block text-sm text-gray-600 mt-4 mb-1">
          {t("description") || "描述"}
          <span className="text-gray-400 ml-2 text-xs">({description.length}/70)</span>
        </label>
        <Textarea
          placeholder={t("detailedDescription") || "详细描述..."}
          value={description}
          onChange={(e) => {
            if (e.target.value.length <= 70) {
              setDescription(e.target.value);
            }
          }}
          maxLength={70}
          rows={3}
        />

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
            className={`min-w-[60px] h-10 ${loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
          >
            {loading ? t("saving") || "记录中..." : t("save") || "记录"}
          </Button>
        </div>
      </div>
    </div>
  );
};
