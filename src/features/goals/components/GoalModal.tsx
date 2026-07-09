"use client";
import React, { useEffect, useState } from "react";
import { DateField } from "../../../shared/components/date/DateField";
import { Button } from "../../../shared/components/ui/Button";
import { ColorSwatchPicker } from "../../../shared/components/ui/ColorSwatchPicker";
import { FieldLabel } from "../../../shared/components/ui/FieldLabel";
import { FormActions } from "../../../shared/components/ui/FormActions";
import { FormDialogShell } from "../../../shared/components/ui/FormDialogShell";
import { Input } from "../../../shared/components/ui/Input";
import { Textarea } from "../../../shared/components/ui/Textarea";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import type { CreateGoalInput, GoalRecord, UpdateGoalInput } from "../types";

export type GoalModalCreateInput = CreateGoalInput;
export type GoalModalUpdateInput = Pick<
  UpdateGoalInput,
  "title" | "description" | "due_date" | "color"
>;

export type GoalModalInitialGoal = Pick<
  GoalRecord,
  | "id"
  | "title"
  | "description"
  | "due_date"
  | "progress"
  | "status"
  | "color"
>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onCreate: (goal: GoalModalCreateInput) => Promise<void>;
  onUpdate: (id: number, updates: GoalModalUpdateInput) => Promise<void>;
  initialGoal?: GoalModalInitialGoal | null;
};

// First swatch (null) means "use the theme's primary green". The rest are
// explicit identifier colors shared with habits.
const GOAL_COLORS: Array<{ value: string | null; swatch: string }> = [
  { value: null, swatch: "var(--color-primary)" },
  { value: "#4f7c8a", swatch: "#4f7c8a" },
  { value: "#7c5c9e", swatch: "#7c5c9e" },
  { value: "#b45309", swatch: "#b45309" },
  { value: "#64748b", swatch: "#64748b" },
];

export const GoalModal = ({
  isOpen,
  onClose,
  onSuccess,
  onCreate,
  onUpdate,
  initialGoal = null,
}: Props) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isEditing = Boolean(initialGoal);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialGoal?.title ?? "");
    setDescription(initialGoal?.description ?? "");
    setDueDate(initialGoal?.due_date ?? "");
    setColor(initialGoal?.color ?? null);
    setMessage(null);
  }, [initialGoal, isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setColor(null);
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
        await onUpdate(initialGoal.id, {
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || null,
          color,
        });
        setLoading(false);
        onSuccess();
        handleClose();
        return;
      }

      await onCreate({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate || null,
        color,
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
    <FormDialogShell
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? t("edit") || "编辑" : t("newGoal") || "新建目标"}
      closeLabel={t("close") || "关闭"}
      modalClassName="max-w-md"
    >
      <FieldLabel className="mt-5" meta={`(${title.length}/30)`}>
        {t("title") || "标题"}
      </FieldLabel>
      <Input
        placeholder={t("enterGoal") || "输入目标..."}
        value={title}
        onChange={(e) => {
          if (e.target.value.length <= 30) setTitle(e.target.value);
        }}
        maxLength={30}
        className="mt-2 rounded-xl"
      />

      <FieldLabel className="mt-4" meta={`(${description.length}/70)`}>
        {t("description") || "描述"}
      </FieldLabel>
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

      <FieldLabel className="mt-4">{t("dueDate") || "日期"}</FieldLabel>
      <DateField
        value={dueDate}
        onChange={setDueDate}
        clearable
        className="mt-2 rounded-xl"
      />

      <FieldLabel className="mt-4">{t("color") || "标识颜色"}</FieldLabel>
      <ColorSwatchPicker
        value={color}
        options={GOAL_COLORS.map(({ value, swatch }) => ({
          value,
          swatch,
          label: value ?? (t("themeDefault") || "主题色"),
        }))}
        onChange={setColor}
        nullable
        className="mt-2"
      />

      {message && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {message}
        </p>
      )}

      <FormActions>
        <Button
          variant="secondary"
          onClick={handleClose}
          className="min-w-[60px] h-10"
        >
          {t("cancel") || "取消"}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="min-w-[60px] h-10"
        >
          {loading
            ? t("saving") || "记录中..."
            : isEditing
              ? t("update") || "更新"
              : t("save") || "记录"}
        </Button>
      </FormActions>
    </FormDialogShell>
  );
};
