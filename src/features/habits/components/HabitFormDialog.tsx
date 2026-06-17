"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../../app/components/ui/Button";
import { Input } from "../../../app/components/ui/Input";
import { Textarea } from "../../../app/components/ui/Textarea";
import { useLanguage } from "../../../app/context/LanguageContext";
import type { CreateHabitInput, HabitFrequency, HabitView, UpdateHabitInput } from "../types";

type HabitFormDialogProps = {
  isOpen: boolean;
  saving?: boolean;
  habit?: HabitView | null;
  onClose: () => void;
  onCreate: (input: CreateHabitInput) => Promise<void>;
  onUpdate?: (habitId: number, input: UpdateHabitInput) => Promise<void>;
};

export function HabitFormDialog({
  isOpen,
  saving = false,
  habit = null,
  onClose,
  onCreate,
  onUpdate,
}: HabitFormDialogProps) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [color, setColor] = useState<string | null>("#2f6f5e");
  const [message, setMessage] = useState<string | null>(null);
  const isEditing = Boolean(habit);

  useEffect(() => {
    if (!isOpen) return;
    setName(habit?.name ?? "");
    setDescription(habit?.description ?? "");
    setFrequency(habit?.frequency ?? "daily");
    setColor(habit?.color ?? "#2f6f5e");
    setMessage(null);
  }, [habit, isOpen]);

  if (!isOpen) return null;

  const reset = () => {
    setName("");
    setDescription("");
    setFrequency("daily");
    setColor("#2f6f5e");
    setMessage(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setMessage(t("pleaseEnterHabitName") || "请填写习惯名称");
      return;
    }

    setMessage(null);

    try {
      if (isEditing && habit && onUpdate) {
        await onUpdate(habit.id, { name, description, frequency, color });
      } else {
        await onCreate({
          name,
          description,
          frequency,
          color,
        });
      }
      handleClose();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("saveFailed") || "保存失败");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-[var(--color-bg-card)] p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {isEditing ? t("edit") || "编辑" : t("newHabit") || "新建习惯"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]"
            aria-label={t("close") || "关闭"}
          >
            <X size={20} />
          </button>
        </div>

        <label className="mt-5 block text-sm font-medium text-[var(--color-text-primary)]">
          {t("habitName") || "习惯名称"}
        </label>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("habitPlaceholder") || "例如：晨间阅读"}
          maxLength={60}
          className="mt-2 rounded-xl"
        />

        <label className="mt-4 block text-sm font-medium text-[var(--color-text-primary)]">
          {t("description") || "描述"}
        </label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("describeHabit") || "描述这个习惯"}
          rows={4}
          className="mt-2 rounded-xl"
        />

        <label className="mt-4 block text-sm font-medium text-[var(--color-text-primary)]">
          {language === "en" ? "Frequency" : "频率"}
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-bg-surface)] p-1">
          {(["daily", "weekly"] as HabitFrequency[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFrequency(value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                frequency === value
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]"
              }`}
            >
              {value === "daily" ? t("daily") || "每日" : t("weekly") || "每周"}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-medium text-[var(--color-text-primary)]">
          {t("color") || "颜色"}
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {["#2f6f5e", "#4f7c8a", "#7c5c9e", "#a16207", "#64748b"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setColor(value)}
              className={`h-8 w-8 rounded-lg border transition-colors duration-150 motion-reduce:transition-none ${
                color === value ? "border-[var(--color-text-primary)]" : "border-transparent"
              }`}
              style={{ backgroundColor: value }}
              aria-label={value}
            />
          ))}
        </div>

        {message && <p className="mt-3 text-sm text-red-500">{message}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            {t("cancel") || "取消"}
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving
              ? t("saving") || "保存中"
              : isEditing
                ? t("update") || "更新"
                : t("save") || "保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
