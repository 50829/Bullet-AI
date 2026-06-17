"use client";
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Modal } from "./ui/Modal";
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
    color?: string | null;
  } | null;
};

// First swatch (null) means "use the theme's primary green". The rest are
// explicit identifier colors shared with habits.
const GOAL_COLORS: Array<{ value: string | null; swatch: string }> = [
  { value: null, swatch: "var(--color-primary)" },
  { value: "#4f7c8a", swatch: "#4f7c8a" },
  { value: "#7c5c9e", swatch: "#7c5c9e" },
  { value: "#a16207", swatch: "#a16207" },
  { value: "#64748b", swatch: "#64748b" },
];

export const GoalModal = ({ isOpen, onClose, onSuccess, initialGoal = null }: Props) => {
  const { t } = useLanguage();
  const { addGoal, updateGoal } = useAppContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isEditing = Boolean(initialGoal);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialGoal?.title ?? "");
    setDescription(initialGoal?.description ?? "");
    setDueDate(initialGoal?.due_date ?? "");
    setColor(initialGoal?.color ?? null);
    setProgress(initialGoal?.progress ?? 0);
    setMessage(null);
  }, [initialGoal, isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setColor(null);
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
          color,
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
        progress: 0,
        color,
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-md rounded-2xl bg-[var(--color-bg-surface)] p-6 shadow-xl"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {isEditing ? t("edit") || "编辑" : t("newGoal") || "新建目标"}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-card)] motion-reduce:transition-none"
          aria-label={t("close") || "关闭"}
        >
          <X size={20} />
        </button>
      </div>

      <label className="mt-5 block text-sm font-medium text-[var(--color-text-primary)]">
        {t("title") || "标题"}
        <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">({title.length}/30)</span>
      </label>
      <Input
        placeholder={t("enterGoal") || "输入目标..."}
        value={title}
        onChange={(e) => {
          if (e.target.value.length <= 30) setTitle(e.target.value);
        }}
        maxLength={30}
        className="mt-2 rounded-xl"
      />

      <label className="mt-4 block text-sm font-medium text-[var(--color-text-primary)]">
        {t("description") || "描述"}
        <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">({description.length}/70)</span>
      </label>
      <Textarea
        placeholder={t("detailedDescription") || "详细描述..."}
        value={description}
        onChange={(e) => {
          if (e.target.value.length <= 70) setDescription(e.target.value);
        }}
        maxLength={70}
        rows={3}
        className="mt-2 rounded-xl"
      />

      <label className="mt-4 block text-sm font-medium text-[var(--color-text-primary)]">
        {t("dueDate") || "日期"}
      </label>
      <Input
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        className="mt-2 rounded-xl"
      />

      <label className="mt-4 block text-sm font-medium text-[var(--color-text-primary)]">
        {t("color") || "标识颜色"}
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {GOAL_COLORS.map(({ value, swatch }) => {
          const selected = color === value;
          return (
            <button
              key={value ?? "theme"}
              type="button"
              onClick={() => setColor(value)}
              className={`h-8 w-8 rounded-lg border-2 transition-colors duration-150 motion-reduce:transition-none ${
                selected ? "border-[var(--color-text-primary)]" : "border-transparent"
              }`}
              style={{ backgroundColor: swatch }}
              aria-label={value ?? (t("themeDefault") || "主题色")}
              aria-pressed={selected}
            />
          );
        })}
      </div>

      {message && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={handleClose} className="min-w-[60px] h-10">
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
    </Modal>
  );
};
