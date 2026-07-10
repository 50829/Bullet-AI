"use client";

import { useRef, useState } from "react";
import { Button } from "../../../shared/components/ui/Button";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import type { GoalPlan } from "../../../lib/ai/goalPlan";

type PlanPreviewProps = {
  plan: GoalPlan;
  adding: boolean;
  onAdd: (plan: GoalPlan) => void | Promise<void>;
};

export function PlanPreview({ plan, adding, onAdd }: PlanPreviewProps) {
  const { t, language } = useLanguage();
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [appliedPlanKey, setAppliedPlanKey] = useState<string | null>(null);
  const planKey = JSON.stringify(plan);
  const applied = appliedPlanKey === planKey;

  const applyPlan = async () => {
    if (applied || adding || inFlight.current) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      await onAdd(plan);
      setAppliedPlanKey(planKey);
    } catch {
      // The parent adds the actionable error message and leaves this retryable.
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-3">
      <p className="mb-2 text-sm font-semibold">
        {language === "en" ? "Plan" : "计划"}
      </p>
      {(["daily", "future"] as const).map((group) => {
        const tasks = plan[group] ?? [];
        if (tasks.length === 0) return null;
        return (
          <div key={group} className="mb-3 last:mb-0">
            <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {group === "daily"
                ? t("todayTasks") || "今日任务"
                : t("recentGoals") || "近期目标"}{" "}
              ({tasks.length})
            </p>
            <ul className="space-y-1 text-xs">
              {tasks.map((task, index) => (
                <li key={`${group}-${index}`}>
                  <strong>{task.title}</strong>
                  {task.description ? `: ${task.description}` : ""}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <Button
        className="mt-3 w-full"
        disabled={applied || adding || submitting}
        onClick={() => void applyPlan()}
      >
        {applied
          ? language === "en"
            ? "Applied"
            : "已添加"
          : adding || submitting
            ? t("adding") || "添加中..."
            : t("addGoals") || "添加到目标"}
      </Button>
    </div>
  );
}
