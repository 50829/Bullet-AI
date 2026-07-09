"use client";

import { GoalCalendar } from "../components/GoalCalendar";
import { Card } from "../../../shared/components/ui/Card";
import { SegmentedControl } from "../../../shared/components/ui/SegmentedControl";
import type { GoalRecord } from "../types";
import { GoalBucketPanel } from "./GoalBucketPanel";
import type { GoalRightViewMode } from "./useGoalPlanningPage";

type GoalPlanningBoardProps = {
  allGoals: GoalRecord[];
  selectedDate: Date | null;
  rightViewMode: GoalRightViewMode;
  migrationListGoals: GoalRecord[];
  selectedDateGoals: GoalRecord[];
  language: "zh" | "en";
  t: (key: string) => string;
  onDateSelect: (date: Date) => void;
  onViewModeChange: (mode: GoalRightViewMode) => void;
  onReorderGoals: (orderedIds: number[]) => void;
  onCompleteGoal: (goal: GoalRecord) => void | Promise<void>;
  onEditGoal: (goal: GoalRecord) => void;
  onDeleteGoal: (goal: GoalRecord) => void;
  onMigrateGoal: (goal: GoalRecord) => void | Promise<void>;
  onMoveGoalBack: (goal: GoalRecord) => void | Promise<void>;
};

export function GoalPlanningBoard({
  allGoals,
  selectedDate,
  rightViewMode,
  migrationListGoals,
  selectedDateGoals,
  language,
  t,
  onDateSelect,
  onViewModeChange,
  onReorderGoals,
  onCompleteGoal,
  onEditGoal,
  onDeleteGoal,
  onMigrateGoal,
  onMoveGoalBack,
}: GoalPlanningBoardProps) {
  const scheduleTitle = selectedDate
    ? language === "en"
      ? selectedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
    : t("selectDate") || "请选择日期";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="lg:h-[520px]">
        <GoalCalendar
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          goals={allGoals}
        />
      </div>

      <div className="lg:h-[min(520px,calc(100dvh-6rem))]">
        <Card
          className="relative flex min-h-[400px] flex-col rounded-xl p-5 lg:h-full"
          style={{
            backgroundColor:
              "var(--color-task-panel-card, var(--color-bg-card))",
          }}
        >
          <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-2xl font-semibold text-theme-primary">
              {rightViewMode === "migration"
                ? t("migrationList") || "待分配任务"
                : scheduleTitle}
            </h3>
            <SegmentedControl<GoalRightViewMode>
              value={rightViewMode}
              onChange={onViewModeChange}
              options={[
                {
                  value: "migration",
                  label: t("migrationList") || "待分配任务",
                },
                {
                  value: "schedule",
                  label: t("schedulePlanning") || "日程规划",
                },
              ]}
            />
          </div>

          {rightViewMode === "migration" && (
            <GoalBucketPanel
              goals={migrationListGoals}
              emptyTitle={language === "en" ? "No tasks" : "暂无任务"}
              onReorder={onReorderGoals}
              onComplete={onCompleteGoal}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              getMoveAction={(goal) =>
                selectedDate
                  ? {
                      direction: "forward",
                      label: t("migrate") || "迁移",
                      onClick: () => onMigrateGoal(goal),
                    }
                  : undefined
              }
            />
          )}

          {rightViewMode === "schedule" && (
            <GoalBucketPanel
              goals={selectedDateGoals}
              emptyTitle={language === "en" ? "No goals" : "暂无目标"}
              onReorder={onReorderGoals}
              onComplete={onCompleteGoal}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              getMoveAction={(goal) => ({
                direction: "back",
                label: t("moveBack") || "迁回",
                onClick: () => onMoveGoalBack(goal),
              })}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
