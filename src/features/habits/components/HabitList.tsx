"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { LoadingState } from "@/shared/components/ui/LoadingState";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import type { HabitView } from "../types";
import { HabitCard } from "./HabitCard";
import { HabitDetailDialog } from "./HabitDetailDialog";

type HabitListProps = {
  habits: HabitView[];
  loading?: boolean;
  limit?: number;
  onCreateClick?: () => void;
  onCheckinToday: (habit: HabitView) => Promise<void>;
  onToggleCheckin: (habit: HabitView, dateKey: string) => Promise<void>;
  onEdit?: (habit: HabitView) => void;
  onDelete?: (habit: HabitView) => void;
};

export function HabitList({
  habits,
  loading = false,
  limit,
  onCreateClick,
  onCheckinToday,
  onToggleCheckin,
  onEdit,
  onDelete,
}: HabitListProps) {
  const { t } = useLanguage();
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const visibleHabits = useMemo(
    () => (limit ? habits.slice(0, limit) : habits),
    [habits, limit],
  );
  const selectedHabit =
    habits.find((habit) => habit.clientId === selectedHabitId) ?? null;

  if (loading) return <LoadingState />;

  if (habits.length === 0) {
    return (
      <EmptyState
        title={t("noHabits") || "暂无习惯"}
        action={
          onCreateClick ? (
            <Button onClick={onCreateClick}>
              + {t("newHabit") || "新建习惯"}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-[var(--color-border-muted)]">
        {visibleHabits.map((habit) => (
          <HabitCard
            key={habit.clientId}
            habit={habit}
            onOpen={() => setSelectedHabitId(habit.clientId)}
            onCheckinToday={onCheckinToday}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <HabitDetailDialog
        habit={selectedHabit}
        onClose={() => setSelectedHabitId(null)}
        onToggleCheckin={onToggleCheckin}
      />
    </>
  );
}
