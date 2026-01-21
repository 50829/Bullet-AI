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
          className="rounded-[32px] p-6 shadow-xl max-w-md w-full transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-[var(--color-bg-card)]"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
            {t("confirmLogout") || "确认退出登录"}
          </h3>
          
          <p className="mb-6 text-[var(--color-text-secondary)]">
            {t("confirmLogoutMessage") || "确定要退出登录吗？"}
          </p>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:scale-105 active:scale-95 bg-[color:rgba(0,48,73,0.1)] hover:bg-[color:rgba(0,48,73,0.2)] text-[var(--color-text-primary)]"
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
              className="px-4 py-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:scale-105 active:scale-95 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary-hover)]"
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
