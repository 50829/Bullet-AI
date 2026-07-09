"use client";

import { Plus } from "lucide-react";
import { GoalCard } from "../../../features/goals/components/GoalCard";
import type { GoalRecord as Goal } from "../../../features/goals/types";
import { Button } from "../../../shared/components/ui/Button";
import { DashboardCardSection } from "../../../shared/components/ui/DashboardCardSection";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { LoadingState } from "../../../shared/components/ui/LoadingState";
import { useLanguage } from "../../../shared/i18n/LanguageContext";

type TodayGoalsSectionProps = {
  goals: Goal[];
  loading: boolean;
  remainingCount: number;
  onCreate: () => void;
  onComplete: (goal: Goal) => void | Promise<void>;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
};

export function TodayGoalsSection({
  goals,
  loading,
  remainingCount,
  onCreate,
  onComplete,
  onEdit,
  onDelete,
}: TodayGoalsSectionProps) {
  const { t } = useLanguage();

  return (
    <DashboardCardSection
      className="min-h-[360px]"
      title={t("todayTasks") || "今日任务"}
      description={`${remainingCount} ${t("remainingTasks") || "项待完成"}`}
      action={
        <Button variant="outline" onClick={onCreate}>
          <Plus size={16} />
          {t("new") || "新建"}
        </Button>
      }
    >
      {loading ? (
        <LoadingState />
      ) : goals.length === 0 ? (
        <EmptyState
          title={t("noTasksToday") || "今天还没有任务"}
          action={
            <Button onClick={onCreate}>{t("newGoal") || "新建目标"}</Button>
          }
        />
      ) : (
        <div className="divide-y divide-[var(--color-border-muted)]">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              variant="list"
              onComplete={() => onComplete(goal)}
              onEdit={() => onEdit(goal)}
              onDelete={() => onDelete(goal)}
            />
          ))}
        </div>
      )}
    </DashboardCardSection>
  );
}
