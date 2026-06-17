"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { useLanguage } from '../context/LanguageContext';
import { useAppContext } from "../../context/AppContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialGoal?: {
    id: number;
    title: string;
    description: string;
    due_date?: string | null;
    progress: number;
    status: string;
  } | null;
};

export const GoalModal = ({ isOpen, onClose, onSuccess, initialGoal = null }: Props) => {
  const { t } = useLanguage();
  const { addGoal, updateGoal } = useAppContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isEditing = Boolean(initialGoal);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialGoal?.title ?? "");
    setDescription(initialGoal?.description ?? "");
    setDueDate(initialGoal?.due_date ?? "");
    setProgress(initialGoal?.progress ?? 0);
    setMessage(null);
  }, [initialGoal, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setProgress(0);
    setMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setMessage(t("pleaseEnterTitle") || "请填写目标标题");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isEditing && initialGoal) {
        await updateGoal(initialGoal.id, {
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || null,
          progress,
        });
        setLoading(false);
        onSuccess();
        handleClose();
        return;
      }

      addGoal({
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate || null,
        status: "pending",
        progress,
        image_url: null,
        image_path: null,
        created_at: new Date().toISOString(),
      });
      setLoading(false);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("捕获到异常:", err);
      setLoading(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage(`${t("saveFailed") || "保存失败，请重试"}: ${errorMsg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-bg-surface)] p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? t("edit") || "编辑" : t("newGoal") || "新建目标"}
        </h2>

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

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm text-gray-600">
            {t("dueDate") || "日期"}
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-gray-600">
            {t("progress") || "进度"}
            <Input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(event) =>
                setProgress(Math.min(100, Math.max(0, Number(event.target.value) || 0)))
              }
              className="mt-1"
            />
          </label>
        </div>

        {message && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>}

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
            className={`min-w-[60px] h-10 ${loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
          >
            {loading
              ? t("saving") || "记录中..."
              : isEditing
                ? t("update") || "更新"
                : t("save") || "记录"}
          </Button>
        </div>
      </div>
    </div>
  );
};
