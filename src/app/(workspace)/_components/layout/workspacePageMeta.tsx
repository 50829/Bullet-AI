import React from "react";
import { Camera, Home, Lightbulb, Target, type LucideIcon } from "lucide-react";
import type { WorkspacePage } from "@/lib/navigation/workspaceRoutes";
import type { TopBarHandlers } from "./TopBarContext";

type TranslationFn = (key: string, fallback?: string) => string;

type WorkspacePageMetaInput = TopBarHandlers & {
  currentPage: WorkspacePage;
  t: TranslationFn;
};

type WorkspaceNavItemMetaInput = {
  page: WorkspacePage;
  t: TranslationFn;
  iconSize?: number;
  iconClassName?: string;
};

type WorkspacePageDisplayMeta = {
  Icon: LucideIcon;
  title: string;
  navLabel: string;
  showAssistantButton: boolean;
};

function getWorkspacePageDisplayMeta(
  page: WorkspacePage,
  t: TranslationFn,
): WorkspacePageDisplayMeta {
  switch (page) {
    case "goals":
      return {
        Icon: Target,
        title: t("goals") || "目标",
        navLabel: t("goals") || "目标",
        showAssistantButton: true,
      };
    case "moments":
      return {
        Icon: Camera,
        title: t("moments") || "记录",
        navLabel: t("records") || t("moments") || "记录",
        showAssistantButton: true,
      };
    case "reflections":
      return {
        Icon: Lightbulb,
        title: t("insights") || "感悟",
        navLabel: t("insights") || "感悟",
        showAssistantButton: true,
      };
    default:
      return {
        Icon: Home,
        title: t("today") || "Today",
        navLabel: t("today") || "Today",
        showAssistantButton: false,
      };
  }
}

export function getWorkspaceNavItemMeta({
  page,
  t,
  iconSize = 20,
  iconClassName = "",
}: WorkspaceNavItemMetaInput) {
  const meta = getWorkspacePageDisplayMeta(page, t);
  const PageIcon = meta.Icon;

  return {
    label: meta.navLabel,
    icon: <PageIcon size={iconSize} className={iconClassName} />,
  };
}

export function getWorkspacePageMeta({
  currentPage,
  t,
  onAddMoment,
  onAddGoal,
  onAddReflection,
}: WorkspacePageMetaInput) {
  const meta = getWorkspacePageDisplayMeta(currentPage, t);
  const PageIcon = meta.Icon;
  const addConfig = {
    home: { addButtonText: "", onAdd: undefined },
    goals: { addButtonText: `+ ${t("new")} ${t("goal")}`, onAdd: onAddGoal },
    moments: {
      addButtonText: t("addNewMoment") || "+ 记录新时刻",
      onAdd: onAddMoment,
    },
    reflections: {
      addButtonText: t("addNewReflection") || "+ 记录新感悟",
      onAdd: onAddReflection,
    },
  } satisfies Record<
    WorkspacePage,
    { addButtonText: string; onAdd?: () => void }
  >;

  return {
    icon: <PageIcon size={24} className="text-gray-700" />,
    title: meta.title,
    showAssistantButton: meta.showAssistantButton,
    ...addConfig[currentPage],
  };
}
