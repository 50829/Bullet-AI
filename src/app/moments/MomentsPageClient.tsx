"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Trash2, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { useMomentsContext } from "../../features/workspace/WorkspaceContext";
import { useLanguage } from "../context/LanguageContext";
import { useTopBar } from "../components/layout/TopBar";
import { useWorkspacePageLoading } from "../components/layout/WorkspaceNavigationContext";
import { useToast } from "../components/ui/Toast";
import { PlainImage } from "../components/ui/PlainImage";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import type { MomentRecord as Moment } from "../../features/workspace/types";

const AssistantDrawer = dynamic(
  () =>
    import("../components/AssistantDrawer").then((mod) => mod.AssistantDrawer),
  { ssr: false },
);
const ConfirmDialog = dynamic(
  () =>
    import("../components/ui/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false },
);
const MomentModal = dynamic(
  () => import("../components/MomentModal").then((mod) => mod.MomentModal),
  { ssr: false },
);

type DayCard = {
  date: string;
  moments: Moment[];
};

type MonthCard = {
  month: string;
  monthDisplay: string;
  dayCards: DayCard[];
};

export default function MomentsPageClient() {
  const { moments, loading, refreshMoments, deleteMoment } =
    useMomentsContext();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setTopBarHandlers } = useTopBar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [hasOpenedAIPanel, setHasOpenedAIPanel] = useState(false);
  const [deletingMoment, setDeletingMoment] = useState(false);
  const [activeHighlightMomentId, setActiveHighlightMomentId] = useState<
    number | null
  >(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(
    new Set(),
  );

  const getDateKey = useCallback((dateString: string): string => {
    if (dateString.includes("T")) {
      return dateString.split("T")[0];
    }

    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const formatMonthDisplay = useCallback(
    (monthKey: string) => {
      const [year, month] = monthKey.split("-");
      const monthIndex = Number(month) - 1;
      const date = new Date(Number(year), monthIndex, 1);

      if (language === "en") {
        return new Intl.DateTimeFormat("en", {
          month: "long",
          year: "numeric",
        }).format(date);
      }

      const monthLabel = new Intl.DateTimeFormat("zh-CN", {
        month: "long",
      }).format(date);
      return `${monthLabel} ${year}`;
    },
    [language],
  );

  const getDateFromKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDayNumber = (dateKey: string) => {
    return String(getDateFromKey(dateKey).getDate());
  };

  const formatDayLabel = (dateKey: string) => {
    const date = getDateFromKey(dateKey);

    if (language === "en") {
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
      }).format(date);
    }

    return new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatWeekday = (dateKey: string) => {
    const locale = language === "en" ? "en" : "zh-CN";
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      getDateFromKey(dateKey),
    );
  };

  const formatEntryTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    const locale = language === "en" ? "en" : "zh-CN";
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  const formatEntryCount = (count: number) => {
    if (language === "en")
      return `${count} ${count === 1 ? "entry" : "entries"}`;
    return `${count}篇记录`;
  };

  const getMonthKey = useCallback(
    (dateString: string): string => {
      const dateKey = getDateKey(dateString);
      return dateKey.substring(0, 7);
    },
    [getDateKey],
  );

  const groupMomentsByDate = useCallback(
    (moments: Moment[]): DayCard[] => {
      const grouped = new Map<string, Moment[]>();

      moments.forEach((moment) => {
        const dateKey = getDateKey(moment.created_at);
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(moment);
      });

      const cards: DayCard[] = Array.from(grouped.entries())
        .map(([dateKey, moments]) => ({
          date: dateKey,
          moments: moments.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        }))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      return cards;
    },
    [getDateKey],
  );

  const groupDaysByMonth = useCallback(
    (dayCards: DayCard[]): MonthCard[] => {
      const grouped = new Map<string, DayCard[]>();

      dayCards.forEach((dayCard) => {
        const monthKey = getMonthKey(dayCard.date);
        if (!grouped.has(monthKey)) {
          grouped.set(monthKey, []);
        }
        grouped.get(monthKey)!.push(dayCard);
      });

      const cards: MonthCard[] = Array.from(grouped.entries())
        .map(([monthKey, dayCards]) => ({
          month: monthKey,
          monthDisplay: formatMonthDisplay(monthKey),
          dayCards: dayCards.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
        }))
        .sort(
          (a, b) =>
            new Date(b.month + "-01").getTime() -
            new Date(a.month + "-01").getTime(),
        );

      return cards;
    },
    [formatMonthDisplay, getMonthKey],
  );

  const monthCards = useMemo(
    () => groupDaysByMonth(groupMomentsByDate(moments)),
    [groupDaysByMonth, groupMomentsByDate, moments],
  );
  const highlightedMomentParam = searchParams.get("moment");
  const highlightedMomentId = highlightedMomentParam
    ? Number(highlightedMomentParam)
    : null;

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const handleAddMoment = useCallback(() => {
    setEditingMoment(null);
    setIsModalOpen(true);
  }, []);

  const toggleAIPanel = useCallback(() => {
    setHasOpenedAIPanel(true);
    setShowAIPanel((current) => !current);
  }, []);

  useEffect(() => {
    setTopBarHandlers({
      onAddMoment: handleAddMoment,
      onToggleAIPanel: toggleAIPanel,
    });
  }, [handleAddMoment, setTopBarHandlers, toggleAIPanel]);

  useEffect(() => {
    if (!highlightedMomentId || !Number.isFinite(highlightedMomentId)) return;

    const target = moments.find((moment) => moment.id === highlightedMomentId);
    if (!target) return;

    setActiveHighlightMomentId(highlightedMomentId);

    const monthKey = getMonthKey(target.created_at);

    setCollapsedMonths((current) => {
      if (!current.has(monthKey)) return current;
      const next = new Set(current);
      next.delete(monthKey);
      return next;
    });
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`moment-${highlightedMomentId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const highlightTimer = window.setTimeout(() => {
      setActiveHighlightMomentId((current) =>
        current === highlightedMomentId ? null : current,
      );
    }, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(highlightTimer);
    };
  }, [getMonthKey, highlightedMomentId, moments]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMoment(null);
  };
  const handleModalSuccess = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedMoment) return;

    const momentToDelete = selectedMoment;
    setDeletingMoment(true);

    try {
      await deleteMoment(momentToDelete.id, momentToDelete.image_path);
      setShowConfirm(false);
      setSelectedMoment(null);
    } catch (err) {
      console.error("删除异常:", err);
      showToast({
        type: "error",
        message: t("deleteFailed") || "删除失败，请稍后重试",
      });
      void refreshMoments();
    } finally {
      setDeletingMoment(false);
    }
  };

  const isInitialLoading = loading && moments.length === 0;
  const isNavigationLoading = useWorkspacePageLoading(isInitialLoading);

  if (isInitialLoading) {
    return isNavigationLoading ? null : (
      <LoadingState className="min-h-[50dvh]" />
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {hasOpenedAIPanel && (
        <AssistantDrawer
          isOpen={showAIPanel}
          onClose={() => setShowAIPanel(false)}
          title={t("moments") || "记录"}
          placeholder={t("aiInputPlaceholder") || "输入你的想法..."}
          purpose="moment_chat"
        />
      )}

      <div className="flex-1">
        <div className="px-0 pb-4">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-0">
            <div className="space-y-10">
              {monthCards.length === 0 ? (
                <EmptyState
                  title={t("noRecords") || "暂无记录"}
                  action={
                    <Button onClick={handleAddMoment}>
                      {t("newMoment") || "记录"}
                    </Button>
                  }
                />
              ) : (
                monthCards.map((monthCard) => {
                  const isMonthCollapsed = collapsedMonths.has(monthCard.month);
                  const monthEntryCount = monthCard.dayCards.reduce(
                    (count, dayCard) => count + dayCard.moments.length,
                    0,
                  );

                  return (
                    <section
                      key={monthCard.month}
                      className="w-full"
                      aria-labelledby={`month-${monthCard.month}`}
                    >
                      <button
                        type="button"
                        className="group flex w-full items-center gap-3 border-b border-[var(--color-border-muted)] pb-3 text-left transition-colors duration-150 hover:border-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 motion-reduce:transition-none"
                        aria-expanded={!isMonthCollapsed}
                        aria-controls={`month-days-${monthCard.month}`}
                        onClick={() => toggleMonth(monthCard.month)}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 group-hover:bg-[var(--color-bg-surface)] group-hover:text-[var(--color-primary)] motion-reduce:transition-none">
                          {isMonthCollapsed ? (
                            <ChevronDown size={17} />
                          ) : (
                            <ChevronUp size={17} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            id={`month-${monthCard.month}`}
                            className="block text-2xl font-semibold text-[var(--color-text-primary)]"
                          >
                            {monthCard.monthDisplay}
                          </span>
                          <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
                            {formatEntryCount(monthEntryCount)}
                          </span>
                        </span>
                      </button>

                      {!isMonthCollapsed && (
                        <div
                          id={`month-days-${monthCard.month}`}
                          className="relative mt-5 space-y-7 sm:before:absolute sm:before:left-[41px] sm:before:top-1 sm:before:h-full sm:before:w-px sm:before:bg-[var(--color-border-muted)]"
                        >
                          {monthCard.dayCards.map((dayCard) => {
                            return (
                              <article
                                key={dayCard.date}
                                className="relative grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-5"
                              >
                                <div className="relative z-10 flex min-h-12 items-center gap-3 rounded-lg bg-[var(--color-bg-primary)] text-left sm:flex-col sm:justify-start sm:gap-1 sm:px-2 sm:py-2">
                                  <span className="flex items-center gap-2 sm:flex-col sm:gap-0">
                                    <span className="text-3xl font-semibold leading-none text-[var(--color-text-primary)]">
                                      {formatDayNumber(dayCard.date)}
                                    </span>
                                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                                      {formatWeekday(dayCard.date)}
                                    </span>
                                  </span>
                                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[var(--color-text-secondary)] sm:hidden">
                                    <span className="truncate">
                                      {formatDayLabel(dayCard.date)}
                                    </span>
                                    <span>·</span>
                                    <span className="shrink-0">
                                      {formatEntryCount(dayCard.moments.length)}
                                    </span>
                                  </span>
                                </div>

                                <div className="min-w-0 space-y-3">
                                  <div
                                    className="hidden text-sm text-[var(--color-text-secondary)] sm:block"
                                    aria-hidden="true"
                                  >
                                    {formatDayLabel(dayCard.date)} ·{" "}
                                    {formatEntryCount(dayCard.moments.length)}
                                  </div>

                                  {dayCard.moments.map((moment) => (
                                    <div
                                      key={moment.id}
                                      id={`moment-${moment.id}`}
                                      className={`group/item relative overflow-hidden rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-4 py-4 shadow-sm transition-[background-color,box-shadow,border-color] duration-700 ease-out hover:border-[var(--color-border)] motion-reduce:transition-none ${
                                        moment.id === activeHighlightMomentId
                                          ? "bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]"
                                          : ""
                                      }`}
                                    >
                                      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-[var(--color-bg-surface)]/90 opacity-100 shadow-sm transition-opacity duration-150 focus-within:opacity-100 group-hover/item:opacity-100 sm:opacity-0 motion-reduce:transition-none">
                                        <button
                                          type="button"
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 motion-reduce:transition-none"
                                          title={t("edit") || "编辑"}
                                          aria-label={t("edit") || "编辑"}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingMoment(moment);
                                            setIsModalOpen(true);
                                          }}
                                        >
                                          <Edit2 size={17} />
                                        </button>
                                        <button
                                          type="button"
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 motion-reduce:transition-none"
                                          title={t("delete") || "删除"}
                                          aria-label={t("delete") || "删除"}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMoment(moment);
                                            setShowConfirm(true);
                                          }}
                                        >
                                          <Trash2 size={17} />
                                        </button>
                                      </div>

                                      {moment.content && (
                                        <p className="whitespace-pre-line pr-20 text-[17px] leading-8 text-[var(--color-text-primary)]">
                                          {moment.content}
                                        </p>
                                      )}

                                      {moment.image_url && (
                                        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)]">
                                          <PlainImage
                                            src={moment.image_url}
                                            alt="时刻图片"
                                            className="h-auto max-h-[520px] w-full object-cover"
                                          />
                                        </div>
                                      )}

                                      <div className="mt-4 text-xs text-[var(--color-text-secondary)]">
                                        {formatEntryTime(moment.created_at)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <MomentModal
          isOpen
          initialMoment={editingMoment}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {showConfirm && selectedMoment && (
        <ConfirmDialog
          isOpen
          title={t("confirmDelete") || "确认删除这条记录吗？"}
          description={t("cannotRecover") || "删除后不可恢复"}
          confirmLabel={t("confirm") || "确认"}
          cancelLabel={t("cancel") || "取消"}
          loading={deletingMoment}
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowConfirm(false);
            setSelectedMoment(null);
          }}
        />
      )}
    </div>
  );
}
