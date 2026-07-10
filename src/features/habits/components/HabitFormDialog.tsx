"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/Button";
import { ColorSwatchPicker } from "@/shared/components/ui/ColorSwatchPicker";
import { FieldLabel } from "@/shared/components/ui/FieldLabel";
import { FormDialogShell } from "@/shared/components/ui/FormDialogShell";
import { FormActions } from "@/shared/components/ui/FormActions";
import { Input } from "@/shared/components/ui/Input";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { Textarea } from "@/shared/components/ui/Textarea";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import type {
  CreateHabitInput,
  HabitFrequency,
  HabitView,
  UpdateHabitInput,
} from "../types";

type HabitFormDialogProps = {
  isOpen: boolean;
  saving?: boolean;
  habit?: HabitView | null;
  onClose: () => void;
  onCreate: (input: CreateHabitInput) => Promise<void>;
  onUpdate?: (habitClientId: string, input: UpdateHabitInput) => Promise<void>;
};

const HABIT_COLORS = ["#2f6f5e", "#4f7c8a", "#7c5c9e", "#b45309", "#64748b"];

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setMessage(t("pleaseEnterHabitName") || "请填写习惯名称");
      return;
    }

    setMessage(null);

    try {
      if (isEditing && habit && onUpdate) {
        await onUpdate(habit.clientId, { name, description, frequency, color });
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
      setMessage(
        err instanceof Error ? err.message : t("saveFailed") || "保存失败",
      );
    }
  };

  return (
    <FormDialogShell
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? t("edit") || "编辑" : t("newHabit") || "新建习惯"}
      closeLabel={t("close") || "关闭"}
      modalClassName="max-w-md"
      panelClassName="w-full rounded-2xl bg-[var(--color-bg-card)] p-5 shadow-xl"
      onSubmit={handleSubmit}
    >
      <FieldLabel className="mt-5">{t("habitName") || "习惯名称"}</FieldLabel>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t("habitPlaceholder") || "例如：晨间阅读"}
        maxLength={60}
        className="mt-2 rounded-xl"
      />

      <FieldLabel className="mt-4">{t("description") || "描述"}</FieldLabel>
      <Textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder={t("describeHabit") || "描述这个习惯"}
        rows={4}
        className="mt-2 rounded-xl"
      />

      <FieldLabel className="mt-4">
        {language === "en" ? "Frequency" : "频率"}
      </FieldLabel>
      <SegmentedControl<HabitFrequency>
        value={frequency}
        onChange={setFrequency}
        className="mt-2 w-full"
        options={[
          { value: "daily", label: t("daily") || "每日" },
          { value: "weekly", label: t("weekly") || "每周" },
        ]}
      />

      <FieldLabel className="mt-4">{t("color") || "颜色"}</FieldLabel>
      <ColorSwatchPicker
        value={color}
        options={HABIT_COLORS.map((value) => ({
          value,
          swatch: value,
          label: value,
        }))}
        onChange={setColor}
        className="mt-2"
      />

      {message && <p className="mt-3 text-sm text-red-500">{message}</p>}

      <FormActions>
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
      </FormActions>
    </FormDialogShell>
  );
}
