"use client";

import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { HabitList } from "@/features/habits/components/HabitList";
import type { HabitView } from "@/features/habits/types";

type HabitsSectionProps = {
  title: string;
  newLabel: string;
  habits: HabitView[];
  loading: boolean;
  error: string | null;
  onCreateClick: () => void;
  onCheckinToday: (habit: HabitView) => Promise<void>;
  onToggleCheckin: (habit: HabitView, dateKey: string) => Promise<void>;
  onEdit: (habit: HabitView) => void;
  onDelete: (habit: HabitView) => void;
};

export function HabitsSection({
  title,
  newLabel,
  habits,
  loading,
  error,
  onCreateClick,
  onCheckinToday,
  onToggleCheckin,
  onEdit,
  onDelete,
}: HabitsSectionProps) {
  return (
    <div className="mt-6">
      <Card className="rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            {title}
          </h3>
          <Button onClick={onCreateClick} variant="outline">
            <Plus size={16} />
            {newLabel}
          </Button>
        </div>
        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <HabitList
          habits={habits}
          loading={loading}
          onCreateClick={onCreateClick}
          onCheckinToday={onCheckinToday}
          onToggleCheckin={onToggleCheckin}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Card>
    </div>
  );
}
