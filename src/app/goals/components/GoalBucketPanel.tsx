"use client";

import { EmptyState } from "../../components/ui/EmptyState";
import { GoalCard } from "../../../features/goals/components/GoalCard";
import {
  SortableGoalItem,
  SortableGoalList,
} from "../../../features/goals/components/SortableGoalList";
import type { GoalRecord } from "../../../features/workspace/types";

type GoalBucketPanelProps = {
  goals: GoalRecord[];
  emptyTitle: string;
  onReorder: (orderedIds: number[]) => void;
  onComplete: (goal: GoalRecord) => void | Promise<void>;
  onEdit: (goal: GoalRecord) => void;
  onDelete: (goal: GoalRecord) => void;
  getMoveAction: (goal: GoalRecord) =>
    | {
        direction: "forward" | "back";
        label: string;
        onClick: () => void | Promise<void>;
      }
    | undefined;
};

export function GoalBucketPanel({
  goals,
  emptyTitle,
  onReorder,
  onComplete,
  onEdit,
  onDelete,
  getMoveAction,
}: GoalBucketPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {goals.length === 0 && <EmptyState title={emptyTitle} />}
      <div className="min-h-0 flex-1 divide-y divide-[var(--color-border-muted)] overflow-y-auto">
        <SortableGoalList
          ids={goals.map((goal) => goal.id)}
          onReorder={(orderedIds) => onReorder(orderedIds)}
        >
          {goals.map((goal) => (
            <SortableGoalItem key={goal.id} id={goal.id}>
              <GoalCard
                goal={goal}
                variant="list"
                onComplete={() => onComplete(goal)}
                onEdit={() => onEdit(goal)}
                onDelete={() => onDelete(goal)}
                moveAction={getMoveAction(goal)}
              />
            </SortableGoalItem>
          ))}
        </SortableGoalList>
      </div>
    </div>
  );
}
