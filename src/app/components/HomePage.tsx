"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Edit2, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useHabits } from "../../features/habits/hooks/useHabits";
import type { HabitView } from "../../features/habits/types";
import { HabitList } from "../../features/habits/components/HabitList";
import { HabitFormDialog } from "../../features/habits/components/HabitFormDialog";
import { useLanguage } from "../context/LanguageContext";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { LoadingState } from "./ui/LoadingState";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { MomentModal } from "./MomentModal";
import { GoalModal } from "./GoalModal";
import { ReflectionModal, parseReflectionContent } from "./ReflectionModal";
import { useToast } from "./ui/Toast";

type Goal = {
  id: number;
  title: string;
  description: string;
  status: string;
  due_date?: string | null;
  progress: number;
  _local?: { pending?: boolean; failed?: boolean };
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function SyncPill({ status }: { status: "idle" | "syncing" | "failed" }) {
  const label =
    status === "syncing" ? "同步中" : status === "failed" ? "同步失败" : "已本地保存";
  const className =
    status === "failed"
      ? "bg-red-50 text-red-700"
      : status === "syncing"
        ? "bg-amber-50 text-amber-700"
        : "bg-[var(--color-primary-light)] text-[var(--color-primary)]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {status === "syncing" && <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" />}
      {label}
    </span>
  );
}

export default function HomePage() {
  const {
    moments,
    reflections,
    goals,
    loading,
    syncStatus,
    updateGoal,
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
  const [momentOpen, setMomentOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitView | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<HabitView | null>(null);

  const today = todayKey();
  const todayGoals = useMemo(
    () => goals.filter((goal) => goal.due_date === today),
    [goals, today],
  );
  const openTodayGoals = todayGoals.filter((goal) => goal.status !== "completed");
  const todayHabits = habits.slice(0, 5);
  const recentItems = useMemo(() => {
    const momentItems = moments.slice(0, 4).map((moment) => ({
      id: `moment-${moment.id}`,
      type: t("moments") || "记录",
      title: moment.content.slice(0, 42) || t("newMoment") || "记录",
      time: moment.created_at,
    }));
    const reflectionItems = reflections.slice(0, 3).map((reflection) => {
      const parsed = parseReflectionContent(reflection);
      return {
        id: `reflection-${reflection.id}`,
        type: t("insights") || "感悟",
        title: parsed.title || parsed.body.slice(0, 42),
        time: reflection.updated_at || reflection.created_at,
      };
    });

    return [...momentItems, ...reflectionItems]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }, [moments, reflections, t]);

  const completeGoal = async (goal: Goal) => {
    try {
      await updateGoal(goal.id, { status: "completed", progress: 100 });
      showToast({ type: "success", message: t("operationSuccess") || "更新成功" });
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : t("updateFailed") || "更新失败",
      });
    }
  };

  const confirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    try {
      await removeHabit(habitToDelete.id);
      showToast({ type: "success", message: t("deleteSuccess") || "删除成功" });
      setHabitToDelete(null);
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : t("deleteFailed") || "删除失败",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)]">Today</p>
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
          <SyncPill status={syncStatus} />
          {syncStatus === "failed" && (
            <Button variant="outline" onClick={() => void retrySync()}>
              {t("retry") || "重试"}
            </Button>
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
            <LoadingState label={t("loadingGoals") || "目标加载中..."} />
          ) : todayGoals.length === 0 ? (
            <EmptyState
              title={t("noTasksToday") || "今天还没有任务"}
              description={t("selectDateToMigrate") || "新建目标或在目标页把任务迁移到今天。"}
              action={<Button onClick={() => setGoalOpen(true)}>{t("newGoal") || "新建目标"}</Button>}
            />
          ) : (
            <div className="space-y-3">
              {todayGoals.map((goal) => {
                const completed = goal.status === "completed";
                return (
                  <div
                    key={goal.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-card)] p-4"
                  >
                    <button
                      type="button"
                      disabled={completed}
                      onClick={() => void completeGoal(goal)}
                      className={`mt-0.5 rounded-lg p-2 transition-colors duration-150 motion-reduce:transition-none ${
                        completed
                          ? "bg-[var(--color-bg-primary)] text-[var(--color-success)]"
                          : "bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)]"
                      }`}
                      aria-label={t("completeGoal") || "完成目标"}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`font-semibold ${
                            completed
                              ? "text-[var(--color-text-secondary)] line-through"
                              : "text-[var(--color-text-primary)]"
                          }`}
                        >
                          {goal.title}
                        </h3>
                        {goal._local?.failed && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                            {t("syncFailed") || "同步失败"}
                          </span>
                        )}
                        {goal._local?.pending && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            {t("syncing") || "同步中"}
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
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
                {habits.filter((habit) => habit.checkedToday).length}/{habits.length}{" "}
                {t("checkedIn") || "已打卡"}
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
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {t("recentRecords") || "最近更新"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {t("recentRecordsDescription") || "生活记录和感悟会在这里汇总。"}
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
              description={t("recordFeelings") || "记录一点今天发生的事。"}
              action={<Button onClick={() => setMomentOpen(true)}>{t("newMoment") || "记录"}</Button>}
            />
          ) : (
            <div className="divide-y divide-[var(--color-border-muted)]">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-1 rounded-full bg-[var(--color-primary-light)] p-2 text-[var(--color-primary)]">
                    <Clock3 size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{item.type}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-primary)]">
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex h-full flex-col justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex rounded-xl bg-[var(--color-primary-light)] p-2 text-[var(--color-primary)]">
                <Sparkles size={20} />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {t("aiAssistant") || "AI 助手"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {t("aiAssistantHomeHint") || "AI 保持在抽屉里，适合需要整理想法或拆目标时再打开。"}
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("localFirstHint") || "所有更改会先保存在本地，再后台同步到云端。"}
            </p>
          </div>
        </Card>
      </div>

      <MomentModal isOpen={momentOpen} onClose={() => setMomentOpen(false)} onSuccess={() => undefined} />
      <GoalModal isOpen={goalOpen} onClose={() => setGoalOpen(false)} onSuccess={() => undefined} />
      <ReflectionModal
        isOpen={reflectionOpen}
        onClose={() => setReflectionOpen(false)}
        onSuccess={() => undefined}
      />
      <HabitFormDialog
        isOpen={habitOpen}
        saving={habitsSaving}
        habit={editingHabit}
        onClose={() => {
          setHabitOpen(false);
          setEditingHabit(null);
        }}
        onCreate={createHabit}
        onUpdate={updateHabit}
      />
      <ConfirmDialog
        isOpen={Boolean(habitToDelete)}
        title={`${t("confirmDelete") || "确认删除"} ${habitToDelete?.name ?? ""}`}
        description={t("cannotRecover") || "删除后不可恢复。"}
        confirmLabel={t("confirm") || "确认"}
        cancelLabel={t("cancel") || "取消"}
        tone="danger"
        onConfirm={confirmDeleteHabit}
        onCancel={() => setHabitToDelete(null)}
      />
    </div>
  );
}
