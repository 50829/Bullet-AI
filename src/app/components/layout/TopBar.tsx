"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { usePathname } from "next/navigation";
import { Sparkles, Camera, Target, Lightbulb } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { Button } from "../ui/Button";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentUserProfile } from "../../../lib/profile/profileService";
import { useWorkspaceSessionContext } from "../../../features/workspace/WorkspaceContext";
import { getWorkspacePageFromPathname } from "../../../lib/navigation/workspaceRoutes";

type TopBarHandlers = {
  onAddMoment?: () => void;
  onAddGoal?: () => void;
  onAddReflection?: () => void;
  onToggleAIPanel?: () => void;
};

type TopBarContextType = TopBarHandlers & {
  setTopBarHandlers: (handlers: TopBarHandlers) => void;
};

const TopBarContext = createContext<TopBarContextType | null>(null);

export const useTopBar = () => {
  const context = useContext(TopBarContext);
  if (!context) {
    throw new Error("useTopBar must be used within TopBarProvider");
  }
  return context;
};

export const TopBarProvider = ({ children }: { children: React.ReactNode }) => {
  const [handlers, setHandlers] = useState<TopBarHandlers>({});

  const setTopBarHandlers = useCallback((newHandlers: TopBarHandlers) => {
    setHandlers(newHandlers);
  }, []);

  const value: TopBarContextType = useMemo(
    () => ({
      ...handlers,
      setTopBarHandlers,
    }),
    [handlers, setTopBarHandlers],
  );

  return (
    <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>
  );
};

export const TopBar = () => {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { syncStatus } = useWorkspaceSessionContext();
  const currentPage = getWorkspacePageFromPathname(pathname);
  const context = useContext(TopBarContext);
  const [username, setUsername] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const profile = await getCurrentUserProfile();
        setUsername(profile?.username || null);
      } catch (error) {
        console.error("获取用户名失败:", error);
        setUsername(null);
      }
    };

    fetchUsername();

    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ username?: string | null }>)
        .detail;
      setUsername(detail?.username || null);
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const profile = await getCurrentUserProfile();
        setUsername(profile?.username || null);
      } else {
        setUsername(null);
      }
    });

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      subscription.unsubscribe();
    };
  }, []);

  if (!context) {
    return (
      <div className="fixed top-0 left-0 right-0 z-30 bg-transparent">
        <div className="w-full flex items-center justify-between gap-4 pl-4 pr-4 py-3">
          <div className="flex items-center gap-3 flex-shrink-0">
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
            {currentPage === "home" && username && (
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
            )}
          </div>
        </div>
      </div>
    );
  }

  const { onAddMoment, onAddGoal, onAddReflection, onToggleAIPanel } = context;

  const getPageInfo = () => {
    switch (currentPage) {
      case "goals":
        return {
          icon: <Target size={24} className="text-gray-700" />,
          title: t("goals") || "目标",
          showAssistantButton: true,
          addButtonText: `+ ${t("new")} ${t("goal")}`,
          onAdd: onAddGoal,
        };
      case "moments":
        return {
          icon: <Camera size={24} className="text-gray-700" />,
          title: t("moments") || "记录",
          showAssistantButton: true,
          addButtonText: t("addNewMoment") || "+ 记录新时刻",
          onAdd: onAddMoment,
        };
      case "reflections":
        return {
          icon: <Lightbulb size={24} className="text-gray-700" />,
          title: t("insights") || "感悟",
          showAssistantButton: true,
          addButtonText: t("addNewReflection") || "+ 记录新感悟",
          onAdd: onAddReflection,
        };
      default:
        return {
          icon: null,
          title: currentPage === "home" ? t("today") || "Today" : "BulletAI",
          showAssistantButton: false,
          addButtonText: "",
          onAdd: undefined,
        };
    }
  };

  const pageInfo = getPageInfo();
  const showButtons = currentPage !== "home";
  const assistantButtonLabel = language === "en" ? "Open panel" : "打开面板";

  return (
    <div className="fixed top-0 left-0 right-0 z-30 h-16 bg-transparent">
      <div className="w-full flex items-center justify-between gap-4 h-full pl-4 pr-4">
        <div className="flex items-center gap-3 flex-shrink-0">
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

        <div
          className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? "ml-auto" : ""}`}
        >
          {syncStatus === "failed" && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              {t("syncFailed") || "同步失败"}
            </span>
          )}
          {showButtons && (
            <>
              {pageInfo.showAssistantButton && onToggleAIPanel && (
                <Button
                  variant="outline"
                  onClick={onToggleAIPanel}
                  className="flex min-w-[40px] items-center justify-center px-2"
                  title={assistantButtonLabel}
                  aria-label={assistantButtonLabel}
                >
                  <Sparkles size={16} />
                </Button>
              )}

              {pageInfo.onAdd && (
                <Button
                  onClick={pageInfo.onAdd}
                  className={isMobile ? "px-3 text-sm" : ""}
                >
                  {isMobile ? "+" : pageInfo.addButtonText}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
