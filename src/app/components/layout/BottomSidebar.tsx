// src/components/layout/BottomSidebar.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import LogoutConfirmDialog from './LogoutConfirmDialog';
import SettingsPanel from './SettingsPanel';

interface UserProfile {
  username: string;
  updated_at: string | null;
}

export const BottomSidebar = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 预先加载用户数据
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username, updated_at")
          .eq("user_id", session.user.id)
          .single();

        if (!error && profile) {
          setUserProfile({
            username: profile.username || '',
            updated_at: profile.updated_at || null,
          });
        }
      } catch (error) {
        console.error("获取用户信息失败:", error);
      }
    };

    fetchUserProfile();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, updated_at")
          .eq("user_id", session.user.id)
          .single();
        
        if (profile) {
          setUserProfile({
            username: profile.username || '',
            updated_at: profile.updated_at || null,
          });
        }
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
    console.log('handleLogoutConfirm 被调用');
    try {
      setShowLogoutDialog(false);
      console.log('对话框已关闭');
      
      // 先执行退出登录
      console.log('开始执行 signOut...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('退出登录失败:', error);
        alert(`退出登录失败: ${error.message}`);
        setShowLogoutDialog(true);
        return;
      }
      
      console.log('signOut 成功');
      
      // 立即跳转到 landing page，使用 replace 避免历史记录
      console.log('跳转到 /');
      window.location.replace('/');
    } catch (error) {
      console.error('退出登录过程出错:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`退出登录出错: ${errorMsg}`);
      setShowLogoutDialog(true);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  return (
    <>
      <aside
        className="fixed left-4 bottom-20 rounded-[32px] p-3 shadow-lg hidden lg:block z-30"
        style={{ backgroundColor: 'var(--color-sidebar, var(--color-primary))' }}
      >
        <nav>
          <ul className="space-y-2">
            {/* 设置按钮 */}
            <li
              className="flex items-center justify-center p-3 cursor-pointer rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--color-sidebar, var(--color-primary))' }}
              onClick={handleSettingsClick}
              title={t("settings") || "设置"}
            >
              <span
                className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-inverse)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              >
                <Settings size={20} />
              </span>
            </li>
            
            {/* 退出登录按钮 */}
            <li
              className="flex items-center justify-center p-3 cursor-pointer rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--color-sidebar, var(--color-primary))' }}
              onClick={handleLogoutClick}
              title={t("logout") || "退出登录"}
            >
              <span
                className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-inverse)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              >
                <LogOut size={20} />
              </span>
            </li>
          </ul>
        </nav>
      </aside>

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
