"use client";

import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import type { PlanData } from "./types";

type PlanPreviewProps = {
  plan: PlanData;
  adding: boolean;
  onAdd: (plan: PlanData) => void | Promise<void>;
};

export function PlanPreview({ plan, adding, onAdd }: PlanPreviewProps) {
  const { t, language } = useLanguage();

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
        disabled={adding}
        onClick={() => onAdd(plan)}
      >
        {adding
          ? t("adding") || "添加中..."
          : t("addToMigrationList") || "加入待分配任务"}
      </Button>
    </div>
  );
}
