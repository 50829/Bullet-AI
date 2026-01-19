// src/components/layout/LogoutConfirmDialog.tsx
"use client";

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface LogoutConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        onClick={onCancel}
      />
      
      {/* 对话框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#efeeeb] rounded-[32px] p-6 shadow-xl max-w-md w-full transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-semibold text-[#003049] mb-4">
            {t("confirmLogout") || "确认退出登录"}
          </h3>
          
          <p className="text-[#6c757d] mb-6">
            {t("confirmLogoutMessage") || "确定要退出登录吗？"}
          </p>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-full bg-[#003049]/10 text-[#003049] hover:bg-[#003049]/20 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:scale-105 active:scale-95"
            >
              {t("cancel") || "取消"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('确认按钮被点击');
                onConfirm();
              }}
              className="px-4 py-2 rounded-full bg-[#003049] text-white hover:bg-[#003049]/90 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:scale-105 active:scale-95"
            >
              {t("confirm") || "确认"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutConfirmDialog;
