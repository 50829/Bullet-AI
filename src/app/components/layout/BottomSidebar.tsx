// src/components/layout/BottomSidebar.tsx
"use client";

import React, { useState } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import LogoutConfirmDialog from './LogoutConfirmDialog';

export const BottomSidebar = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleSettingsClick = () => {
    // 设置按钮目前不放功能
    // TODO: 实现设置功能
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
      <aside className="fixed left-4 bottom-20 bg-[#003049] rounded-[32px] p-3 shadow-lg hidden lg:block z-30">
        <nav>
          <ul className="space-y-2">
            {/* 设置按钮 */}
            <li
              className="flex items-center justify-center p-3 cursor-pointer rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform bg-[#003049] hover:bg-[#003049]/90 hover:scale-105 active:scale-95"
              onClick={handleSettingsClick}
              title={t("settings") || "设置"}
            >
              <span className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] text-[#6c757d] hover:text-white">
                <Settings size={20} />
              </span>
            </li>
            
            {/* 退出登录按钮 */}
            <li
              className="flex items-center justify-center p-3 cursor-pointer rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform bg-[#003049] hover:bg-[#003049]/90 hover:scale-105 active:scale-95"
              onClick={handleLogoutClick}
              title={t("logout") || "退出登录"}
            >
              <span className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] text-[#6c757d] hover:text-white">
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
    </>
  );
};
