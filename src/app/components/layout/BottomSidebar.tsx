"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Home, Lightbulb, LogOut, Settings, Target } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUserProfile, type UserProfile } from '../../../lib/profile/profileService';
import { useToast } from '../ui/Toast';
import {
  WORKSPACE_PAGE_ORDER,
  type WorkspacePage,
} from '../../../lib/navigation/workspaceRoutes';
import { WorkspaceNavLink } from './WorkspaceNavLink';

const LogoutConfirmDialog = dynamic(() => import('./LogoutConfirmDialog'), { ssr: false });
const SettingsPanel = dynamic(() => import('./SettingsPanel'), { ssr: false });

export const BottomSidebar = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const { showToast } = useToast();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navItems: Record<WorkspacePage, { label: string; icon: React.ReactNode }> = {
    home: { label: t("today") || 'Today', icon: <Home size={19} /> },
    goals: { label: t("goals") || '目标', icon: <Target size={19} /> },
    moments: { label: t("records") || t("moments") || '记录', icon: <Camera size={19} /> },
    reflections: { label: t("insights") || '感悟', icon: <Lightbulb size={19} /> },
  };

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('退出登录失败:', error);
        showToast({ type: "error", message: `退出登录失败: ${error.message}` });
        setShowLogoutDialog(true);
        return;
      }

      router.replace('/');
    } catch (error) {
      console.error('退出登录过程出错:', error);
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
      <aside
        className="fixed bottom-20 left-4 z-30 hidden rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-sm lg:block"
      >
        <nav>
          <ul className="space-y-2">
            <li>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
                onClick={handleSettingsClick}
                title={t("settings") || "设置"}
                aria-label={t("settings") || "设置"}
              >
                <Settings size={20} />
              </button>
            </li>
            
            <li>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
                onClick={handleLogoutClick}
                title={t("logout") || "退出登录"}
                aria-label={t("logout") || "退出登录"}
              >
                <LogOut size={20} />
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-md lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {WORKSPACE_PAGE_ORDER.map((page) => {
            const item = navItems[page];
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
            <button
              type="button"
              onClick={handleSettingsClick}
              className="flex h-11 w-full items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
              title={t("settings") || "设置"}
              aria-label={t("settings") || "设置"}
            >
              <Settings size={19} />
            </button>
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
