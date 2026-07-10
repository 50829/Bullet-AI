"use client";

import React, { useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { useWorkspaceSessionContext } from "../../../features/workspace/WorkspaceContext";
import { getWorkspacePageFromPathname } from "../../../lib/navigation/workspaceRoutes";
import { TopBarActions } from "./TopBarActions";
import {
  TopBarContext,
  TopBarProvider,
  type TopBarHandlers,
} from "./TopBarContext";
import { useCurrentUsername } from "./useCurrentUsername";
import { getWorkspacePageMeta } from "./workspacePageMeta";

export { TopBarProvider };

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export const TopBar = () => {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { syncStatus } = useWorkspaceSessionContext();
  const currentPage = getWorkspacePageFromPathname(pathname);
  const context = useContext(TopBarContext);
  const username = useCurrentUsername();
  const isMobile = useIsMobile();
  const handlers: Partial<TopBarHandlers> = context ?? {};
  const pageInfo = getWorkspacePageMeta({
    currentPage,
    t,
    onAddMoment: handlers.onAddMoment,
    onAddGoal: handlers.onAddGoal,
    onAddReflection: handlers.onAddReflection,
  });
  const showButtons = currentPage !== "home";
  const assistantButtonLabel = language === "en" ? "Open panel" : "打开面板";

  return (
    <div className="fixed left-0 right-0 top-0 z-30 h-16 bg-transparent">
      <div className="flex h-full w-full items-center justify-between gap-4 pl-4 pr-4">
        <div className="flex shrink-0 items-center gap-3">
          <Sparkles
            className="h-8 w-8"
            style={{ color: "var(--color-text-secondary)" }}
          />
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            BulletAI
          </span>
          {currentPage === "home" && username ? (
            <>
              <span
                className="mx-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                |
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {language === "en" ? `Hi, ${username}` : `你好，${username}`}
              </span>
            </>
          ) : (
            currentPage !== "home" &&
            pageInfo.icon && (
              <>
                <span
                  className="mx-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  |
                </span>
                {pageInfo.icon}
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {pageInfo.title}
                </h2>
              </>
            )
          )}
        </div>

        <TopBarActions
          syncFailed={syncStatus === "failed"}
          syncFailedLabel={t("syncFailed") || "同步失败"}
          showButtons={showButtons}
          showAssistantButton={pageInfo.showAssistantButton}
          assistantButtonLabel={assistantButtonLabel}
          addButtonText={pageInfo.addButtonText}
          mobile={isMobile}
          onToggleAIPanel={handlers.onToggleAIPanel}
          onAdd={pageInfo.onAdd}
        />
      </div>
    </div>
  );
};
