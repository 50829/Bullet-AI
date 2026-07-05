"use client";

import React, { useMemo, useState } from "react";
import { Clock3, Edit2, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../context/AppContext";
import { useHabits } from "../../features/habits/hooks/useHabits";
import type { HabitView } from "../../features/habits/types";
import { HabitList } from "../../features/habits/components/HabitList";
import { GoalCard } from "../../features/goals/components/GoalCard";
import {
  isGoalCompleted,
  shouldShowGoal,
  sortGoalsByCompletion,
  sortGoalsByOrder,
} from "../../features/goals/goalVisibility";
import { useCompletedGoalRetention } from "../../features/goals/hooks/useCompletedGoalRetention";
import { useLanguage } from "../context/LanguageContext";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { LoadingState } from "./ui/LoadingState";
import { useToast } from "./ui/Toast";
import { parseReflectionContent } from "../../lib/reflections/reflectionContent";

const ConfirmDialog = dynamic(
  () => import("./ui/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  {
    ssr: false,
  },
);
const GoalModal = dynamic(
  () => import("./GoalModal").then((mod) => mod.GoalModal),
  {
    ssr: false,
  },
);
const HabitFormDialog = dynamic(
  () =>
    import("../../features/habits/components/HabitFormDialog").then(
      (mod) => mod.HabitFormDialog,
    ),
  { ssr: false },
);
const MomentModal = dynamic(
  () => import("./MomentModal").then((mod) => mod.MomentModal),
  {
    ssr: false,
  },
);
const ReflectionModal = dynamic(
  () => import("./ReflectionModal").then((mod) => mod.ReflectionModal),
  { ssr: false },
);

type Goal = {
  id: number;
  title: string;
  description: string;
  status: string;
  due_date?: string | null;
  progress: number;
  color?: string | null;
  sort_order?: number | null;
  image_path?: string | null;
  updated_at?: string;
  created_at?: string;
  _local?: { pending?: boolean; failed?: boolean };
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function formatRecentItemDate(value: string) {
  const dateKey = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return value;

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return value;

  const weekday = date.toLocaleDateString("zh-CN", {
    weekday: "short",
  });
  return `${month}-${day} ${weekday}`;
}

export default function HomePage() {
  const router = useRouter();
  const {
    moments,
    reflections,
    goals,
    loading,
    syncStatus,
    updateGoal,
    deleteGoal,
    retrySync,
  } = useAppContext();
  const {
    habits,
    loading: habitsLoading,
    saving: habitsSaving,
    createHabit,
    updateHabit,
    checkinToday,
    toggleCheckin,
    removeHabit,
  } = useHabits();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const completedGoalRetention = useCompletedGoalRetention();
  const [momentOpen, setMomentOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitView | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<HabitView | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const today = todayKey();
  const todayGoals = useMemo(
    () => goals.filter((goal) => goal.due_date === today),
    [goals, today],
  );
  const openTodayGoals = todayGoals.filter(
    (goal) => goal.status !== "completed",
  );
  const visibleTodayGoals = useMemo(
    () =>
      sortGoalsByCompletion(
        sortGoalsByOrder(
          todayGoals.filter((goal) =>
            shouldShowGoal(goal, completedGoalRetention),
          ),
        ),
      ),
    [completedGoalRetention, todayGoals],
  );
  const todayHabits = habits.slice(0, 5);
  const recentItems = useMemo(() => {
    const momentItems = moments.slice(0, 4).map((moment) => ({
      id: `moment-${moment.id}`,
      kind: "moment" as const,
      itemId: moment.id,
      title: moment.content.slice(0, 42) || t("newMoment") || "记录",
      time: moment.created_at,
      dateLabel: formatRecentItemDate(moment.created_at),
    }));
    const reflectionItems = reflections.slice(0, 3).map((reflection) => {
      const parsed = parseReflectionContent(reflection);
      return {
        id: `reflection-${reflection.id}`,
        kind: "reflection" as const,
        itemId: reflection.id,
        title: parsed.title || parsed.body.slice(0, 42),
        time: reflection.updated_at || reflection.created_at,
        dateLabel: formatRecentItemDate(
          reflection.updated_at || reflection.created_at,
        ),
      };
    });

    return [...momentItems, ...reflectionItems]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }, [moments, reflections, t]);

  const openRecentItem = (item: (typeof recentItems)[number]) => {
    if (item.kind === "moment") {
      router.push(`/moments?moment=${item.itemId}`);
    }
  };

  const toggleGoalCompleted = async (goal: Goal) => {
    try {
      const completed = isGoalCompleted(goal);
      await updateGoal(goal.id, {
        status: completed ? "pending" : "completed",
        progress: completed ? 0 : 100,
      });
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("updateFailed") || "更新失败",
      });
    }
  };

  const confirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    try {
      await removeHabit(habitToDelete.id);
      setHabitToDelete(null);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("deleteFailed") || "删除失败",
      });
    }
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      await deleteGoal(goalToDelete.id, goalToDelete.image_path);
      setGoalToDelete(null);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("deleteFailed") || "删除失败",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            Today
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
            {t("todayWorkbench") || "今天的成长工作台"}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {syncStatus === "failed" && (
            <>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                {t("syncFailed") || "同步失败"}
              </span>
              <Button variant="outline" onClick={() => void retrySync()}>
                {t("retry") || "重试"}
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => setMomentOpen(true)}>
            <Plus size={16} />
            {t("newMoment") || "记录"}
          </Button>
          <Button onClick={() => setGoalOpen(true)}>
            <Plus size={16} />
            {t("newGoal") || "目标"}
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-h-[360px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {t("todayTasks") || "今日任务"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {openTodayGoals.length} {t("remainingTasks") || "项待完成"}
              </p>
            </div>
            <Button variant="outline" onClick={() => setGoalOpen(true)}>
              <Plus size={16} />
              {t("new") || "新建"}
            </Button>
          </div>

          {loading.goals && goals.length === 0 ? (
            <LoadingState />
          ) : visibleTodayGoals.length === 0 ? (
            <EmptyState
              title={t("noTasksToday") || "今天还没有任务"}
              action={
                <Button onClick={() => setGoalOpen(true)}>
                  {t("newGoal") || "新建目标"}
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--color-border-muted)]">
              {visibleTodayGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  variant="list"
                  onComplete={() => toggleGoalCompleted(goal)}
                  onEdit={() => {
                    setEditingGoal(goal);
                    setGoalOpen(true);
                  }}
                  onDelete={() => setGoalToDelete(goal)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="min-h-[360px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {t("myHabits") || "今日习惯"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {habits.filter((habit) => habit.checkedToday).length}/
                {habits.length} {t("checkedIn") || "已打卡"}
              </p>
            </div>
            <Button variant="outline" onClick={() => setHabitOpen(true)}>
              <Plus size={16} />
              {t("habit") || "习惯"}
            </Button>
          </div>
          <HabitList
            habits={todayHabits}
            loading={habitsLoading && todayHabits.length === 0}
            onCreateClick={() => setHabitOpen(true)}
            onCheckinToday={checkinToday}
            onToggleCheckin={toggleCheckin}
            onEdit={(habit) => {
              setEditingHabit(habit);
              setHabitOpen(true);
            }}
            onDelete={setHabitToDelete}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {t("recentRecords") || "最近更新"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {t("recentRecordsDescription") ||
                  "生活记录和感悟会在这里汇总。"}
              </p>
            </div>
            <Button variant="outline" onClick={() => setReflectionOpen(true)}>
              <Edit2 size={16} />
              {t("newReflection") || "感悟"}
            </Button>
          </div>
          {recentItems.length === 0 ? (
            <EmptyState
              title={t("noRecords") || "暂无记录"}
              action={
                <Button onClick={() => setMomentOpen(true)}>
                  {t("newMoment") || "记录"}
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--color-border-muted)]">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openRecentItem(item)}
                  disabled={item.kind !== "moment"}
                  className="group grid min-h-[68px] w-full grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 enabled:hover:bg-[var(--color-bg-primary)] enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-[var(--color-primary)] disabled:cursor-default motion-reduce:transition-none"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                    <Clock3 size={18} strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--color-primary)]">
                      {item.dateLabel}
                    </p>
                    <p className="mt-1 line-clamp-2 text-base leading-6 text-[var(--color-text-primary)]">
                      {item.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {momentOpen && (
        <MomentModal
          isOpen
          onClose={() => setMomentOpen(false)}
          onSuccess={() => undefined}
        />
      )}
      {goalOpen && (
        <GoalModal
          isOpen={goalOpen}
          initialGoal={editingGoal}
          onClose={() => {
            setGoalOpen(false);
            setEditingGoal(null);
          }}
          onSuccess={() => undefined}
        />
      )}
      {reflectionOpen && (
        <ReflectionModal
          isOpen
          onClose={() => setReflectionOpen(false)}
          onSuccess={() => undefined}
        />
      )}
      {habitOpen && (
        <HabitFormDialog
          isOpen
          saving={habitsSaving}
          habit={editingHabit}
          onClose={() => {
            setHabitOpen(false);
            setEditingHabit(null);
          }}
          onCreate={createHabit}
          onUpdate={updateHabit}
        />
      )}
      {habitToDelete && (
        <ConfirmDialog
          isOpen
          title={`${t("confirmDelete") || "确认删除"} ${habitToDelete?.name ?? ""}`}
          description={t("cannotRecover") || "删除后不可恢复。"}
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          tone="danger"
          onConfirm={confirmDeleteHabit}
          onCancel={() => setHabitToDelete(null)}
        />
      )}
      {goalToDelete && (
        <ConfirmDialog
          isOpen
          title={`${t("confirmDelete") || "确认删除"} ${goalToDelete?.title ?? ""}`}
          description={t("cannotRecover") || "删除后不可恢复。"}
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          tone="danger"
          onConfirm={confirmDeleteGoal}
          onCancel={() => setGoalToDelete(null)}
        />
      )}
    </div>
  );
}
