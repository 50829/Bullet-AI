"use client";

import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, Edit2, Trash2 } from "lucide-react";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { ActionButtonGroup } from "../../../shared/components/ui/ActionButtonGroup";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { isGoalCompleted } from "../goalVisibility";

export type GoalCardGoal = {
  id: number;
  title: string;
  description?: string | null;
  status?: string;
  color?: string | null;
  _local?: { failed?: boolean };
};

type GoalCardMoveAction = {
  direction: "forward" | "back";
  label: string;
  onClick: () => void | Promise<void>;
};

type GoalCardProps = {
  goal: GoalCardGoal;
  onComplete: () => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  moveAction?: GoalCardMoveAction;
  variant?: "card" | "list";
};

export function GoalCard({
  goal,
  onComplete,
  onEdit,
  onDelete,
  moveAction,
  variant = "card",
}: GoalCardProps) {
  const { t } = useLanguage();
  const completed = isGoalCompleted(goal);
  const accent = goal.color || "var(--color-primary)";
  const MoveIcon = moveAction?.direction === "back" ? ArrowLeft : ArrowRight;
  const isList = variant === "list";
  const showMoveAction = Boolean(moveAction && !completed);
  const listGrid = showMoveAction
    ? "grid-cols-[36px_minmax(0,1fr)_116px]"
    : "grid-cols-[36px_minmax(0,1fr)_76px]";

  return (
    <div
      className={
        isList
          ? `grid min-h-[68px] ${listGrid} items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-[var(--color-bg-primary)] motion-reduce:transition-none`
          : "grid min-h-[112px] grid-cols-[44px_minmax(0,1fr)] items-center gap-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-card)] p-4 sm:grid-cols-[44px_minmax(0,1fr)_128px]"
      }
    >
      <button
        type="button"
        onClick={() => void onComplete()}
        style={{ "--goal-accent": accent } as CSSProperties}
        className={`flex items-center justify-center transition-colors duration-150 motion-reduce:transition-none ${
          isList ? "h-8 w-8 rounded-full" : "h-11 w-11 rounded-xl"
        } ${
          completed
            ? "bg-[var(--goal-accent)] text-[var(--color-text-on-primary)] hover:opacity-90"
            : "text-[var(--goal-accent)] ring-2 ring-inset ring-[var(--goal-accent)] hover:bg-[var(--goal-accent)] hover:text-[var(--color-text-on-primary)]"
        }`}
        aria-label={completed ? "取消完成" : t("completeGoal") || "完成目标"}
      >
        <Check size={isList ? 18 : 20} strokeWidth={2.5} />
      </button>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h4
            className={`truncate font-semibold ${
              isList ? "text-base" : "text-lg"
            } ${
              completed
                ? "text-[var(--color-text-secondary)] line-through decoration-[var(--color-text-secondary)] decoration-2"
                : "text-[var(--color-text-primary)]"
            }`}
          >
            {goal.title}
          </h4>
          {goal._local?.failed && (
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
              {t("syncFailed") || "同步失败"}
            </span>
          )}
        </div>
        {goal.description && (
          <p
            className={`line-clamp-2 text-sm text-[var(--color-text-secondary)] ${
              isList ? "mt-1 leading-5" : "mt-2 leading-6"
            } ${completed ? "line-through decoration-[var(--color-text-secondary)]" : ""}`}
          >
            {goal.description}
          </p>
        )}
      </div>

      <ActionButtonGroup
        variant="inline"
        visibility="always"
        className={`${isList ? "" : "col-span-2 sm:col-span-1"} justify-self-end`}
      >
        {showMoveAction && moveAction ? (
          <IconButton
            icon={<MoveIcon size={19} />}
            label={moveAction.label}
            tone="primary"
            onClick={() => void moveAction.onClick()}
          />
        ) : null}

        <IconButton
          icon={<Edit2 size={19} />}
          label={t("edit") || "编辑"}
          tone="primary"
          onClick={onEdit}
        />

        <IconButton
          icon={<Trash2 size={19} />}
          label={t("delete") || "删除"}
          tone="danger"
          onClick={onDelete}
        />
      </ActionButtonGroup>
    </div>
  );
}
