"use client";

import { Plus } from "lucide-react";
import { HabitList } from "../../../features/habits/components/HabitList";
import type { HabitView } from "../../../features/habits/types";
import { Button } from "../ui/Button";
import { DashboardCardSection } from "../ui/DashboardCardSection";
import { useLanguage } from "../../context/LanguageContext";

type TodayHabitsSectionProps = {
  habits: HabitView[];
  allHabits: HabitView[];
  loading: boolean;
  onCreate: () => void;
  onCheckinToday: (habit: HabitView) => Promise<void>;
  onToggleCheckin: (habit: HabitView, dateKey: string) => Promise<void>;
  onEdit: (habit: HabitView) => void;
  onDelete: (habit: HabitView) => void;
};

export function TodayHabitsSection({
  habits,
  allHabits,
  loading,
  onCreate,
  onCheckinToday,
  onToggleCheckin,
  onEdit,
  onDelete,
}: TodayHabitsSectionProps) {
  const { t } = useLanguage();
  const checkedCount = allHabits.filter((habit) => habit.checkedToday).length;

  return (
    <DashboardCardSection
      className="min-h-[360px]"
      title={t("myHabits") || "今日习惯"}
      description={`${checkedCount}/${allHabits.length} ${t("checkedIn") || "已打卡"}`}
      action={
        <Button variant="outline" onClick={onCreate}>
          <Plus size={16} />
          {t("habit") || "习惯"}
        </Button>
      }
    >
      <HabitList
        habits={habits}
        loading={loading}
        onCreateClick={onCreate}
        onCheckinToday={onCheckinToday}
        onToggleCheckin={onToggleCheckin}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </DashboardCardSection>
  );
}
