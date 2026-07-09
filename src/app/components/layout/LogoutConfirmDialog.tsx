// src/components/layout/LogoutConfirmDialog.tsx
"use client";

import React from "react";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { Button } from "../../../shared/components/ui/Button";

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
        className="fixed inset-0 bg-black/40 z-50 transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onCancel}
      />

      {/* 对话框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
            {t("confirmLogout") || "确认退出登录"}
          </h3>

          <p className="mb-6 text-[var(--color-text-secondary)]">
            {t("confirmLogoutMessage") || "确定要退出登录吗？"}
          </p>

          <div className="flex gap-3 justify-end">
            <Button type="button" onClick={onCancel} variant="ghost">
              {t("cancel") || "取消"}
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onConfirm();
              }}
            >
              {t("confirm") || "确认"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutConfirmDialog;
