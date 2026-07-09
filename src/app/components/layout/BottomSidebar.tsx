"use client";

import React, { useState, useEffect } from "react";
import { LogOut, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { supabase } from "../../../lib/supabaseClient";
import { signOutAndClearLocalData } from "../../../lib/auth/logout";
import {
  getCurrentUserProfile,
  type UserProfile,
} from "../../../lib/profile/profileService";
import { useToast } from "../../../shared/components/ui/Toast";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { WORKSPACE_PAGE_ORDER } from "../../../lib/navigation/workspaceRoutes";
import { WorkspaceNavLink } from "./WorkspaceNavLink";
import { getWorkspaceNavItemMeta } from "./workspacePageMeta";

const LogoutConfirmDialog = dynamic(() => import("./LogoutConfirmDialog"), {
  ssr: false,
});
const SettingsPanel = dynamic(() => import("./SettingsPanel"), { ssr: false });

export const BottomSidebar = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const { showToast } = useToast();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error("获取用户信息失败:", error);
      }
    };

    fetchUserProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSettingsClick = () => {
    setShowSettingsPanel(true);
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      setShowLogoutDialog(false);
      const { error } = await signOutAndClearLocalData();

      if (error) {
        console.error("退出登录失败:", error);
        showToast({ type: "error", message: `退出登录失败: ${error.message}` });
        setShowLogoutDialog(true);
        return;
      }

      router.replace("/");
    } catch (error) {
      console.error("退出登录过程出错:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showToast({ type: "error", message: `退出登录出错: ${errorMsg}` });
      setShowLogoutDialog(true);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  return (
    <>
      <aside className="fixed bottom-20 left-4 z-30 hidden rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-sm lg:block">
        <nav>
          <ul className="space-y-2">
            <li>
              <IconButton
                icon={<Settings size={20} />}
                label={t("settings") || "设置"}
                tone="primary"
                size="lg"
                onClick={handleSettingsClick}
              />
            </li>

            <li>
              <IconButton
                icon={<LogOut size={20} />}
                label={t("logout") || "退出登录"}
                tone="danger"
                size="lg"
                onClick={handleLogoutClick}
              />
            </li>
          </ul>
        </nav>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-md lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {WORKSPACE_PAGE_ORDER.map((page) => {
            const item = getWorkspaceNavItemMeta({
              page,
              t,
              iconSize: 19,
            });
            return (
              <li key={page}>
                <WorkspaceNavLink
                  page={page}
                  icon={item.icon}
                  label={item.label}
                  className="w-full"
                />
              </li>
            );
          })}
          <li>
            <IconButton
              icon={<Settings size={19} />}
              label={t("settings") || "设置"}
              tone="primary"
              size="lg"
              onClick={handleSettingsClick}
              className="w-full"
            />
          </li>
        </ul>
      </nav>

      {showLogoutDialog && (
        <LogoutConfirmDialog
          onConfirm={handleLogoutConfirm}
          onCancel={handleLogoutCancel}
        />
      )}

      {showSettingsPanel && (
        <SettingsPanel
          onClose={() => setShowSettingsPanel(false)}
          initialProfile={userProfile}
          onProfileUpdate={(profile) => {
            setUserProfile(profile);
          }}
        />
      )}
    </>
  );
};
