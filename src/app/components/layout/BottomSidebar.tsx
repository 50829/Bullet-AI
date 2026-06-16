// src/components/layout/BottomSidebar.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Home, Lightbulb, LogOut, Settings, Target } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../../lib/supabaseClient';
import LogoutConfirmDialog from './LogoutConfirmDialog';
import SettingsPanel from './SettingsPanel';
import { getCurrentUserProfile, type UserProfile } from '../../../lib/profile/profileService';
import { useToast } from '../ui/Toast';

export const BottomSidebar = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const currentPage = searchParams.get('page') || 'home';

  const navItems = [
    { page: 'home', label: 'Home', icon: <Home size={19} /> },
    { page: 'moments', label: t("moments") || '记录', icon: <Camera size={19} /> },
    { page: 'goals', label: t("goals") || '目标', icon: <Target size={19} /> },
    { page: 'reflections', label: t("insights") || '感悟', icon: <Lightbulb size={19} /> },
  ];

  // 预先加载用户数据
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

    // 监听认证状态变化
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
            {/* 设置按钮 */}
            <li
            >
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
            
            {/* 退出登录按钮 */}
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
        <ul className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <li key={item.page}>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard?page=${item.page}`)}
                  className={`flex h-11 w-full items-center justify-center rounded-xl transition-colors duration-150 motion-reduce:transition-none ${
                    isActive
                      ? 'bg-[var(--color-bg-primary)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)]'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
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
          <li>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex h-11 w-full items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 motion-reduce:transition-none"
              title={t("logout") || "退出登录"}
              aria-label={t("logout") || "退出登录"}
            >
              <LogOut size={19} />
            </button>
          </li>
        </ul>
      </nav>

      {/* 退出登录确认对话框 */}
      {showLogoutDialog && (
        <LogoutConfirmDialog
          onConfirm={handleLogoutConfirm}
          onCancel={handleLogoutCancel}
        />
      )}

      {/* 设置面板 */}
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
