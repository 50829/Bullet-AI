"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Edit2, Trash2 } from "lucide-react";
import { useLanguage } from "../../../app/context/LanguageContext";
import { isGoalCompleted } from "../goalVisibility";

export type GoalCardGoal = {
  id: number;
  title: string;
  description?: string | null;
  status?: string;
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
};

export function GoalCard({ goal, onComplete, onEdit, onDelete, moveAction }: GoalCardProps) {
  const { t } = useLanguage();
  const completed = isGoalCompleted(goal);
  const MoveIcon = moveAction?.direction === "back" ? ArrowLeft : ArrowRight;

  return (
    <div className="grid min-h-[112px] grid-cols-[44px_minmax(0,1fr)] items-center gap-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-card)] p-4 sm:grid-cols-[44px_minmax(0,1fr)_128px]">
      <button
        type="button"
        disabled={completed}
        onClick={() => void onComplete()}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 motion-reduce:transition-none ${
          completed
            ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
            : "bg-[var(--color-bg-surface)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)]"
        }`}
        aria-label={t("completeGoal") || "完成目标"}
      >
        <CheckCircle2 size={22} />
      </button>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="truncate text-lg font-semibold text-[var(--color-text-primary)]">
            {goal.title}
          </h4>
          {goal._local?.failed && (
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
              {t("syncFailed") || "同步失败"}
            </span>
          )}
        </div>
        {goal.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            {goal.description}
          </p>
        )}
      </div>

      <div className="col-span-2 grid grid-cols-3 justify-self-end gap-2 sm:col-span-1">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
          title={t("edit") || "编辑"}
          aria-label={t("edit") || "编辑"}
          onClick={onEdit}
        >
          <Edit2 size={19} />
        </button>

        {moveAction && !completed ? (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
            title={moveAction.label}
            aria-label={moveAction.label}
            onClick={() => void moveAction.onClick()}
          >
            <MoveIcon size={19} />
          </button>
        ) : (
          <span aria-hidden="true" className="h-10 w-10" />
        )}

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
          title={t("delete") || "删除"}
          aria-label={t("delete") || "删除"}
          onClick={onDelete}
        >
          <Trash2 size={19} />
        </button>
      </div>
    </div>
  );
}
