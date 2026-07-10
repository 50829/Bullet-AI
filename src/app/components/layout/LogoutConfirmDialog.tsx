// src/components/layout/LogoutConfirmDialog.tsx
"use client";

import React from "react";
import { useLanguage } from "../../../shared/i18n/LanguageContext";
import { Button } from "../../../shared/components/ui/Button";

interface LogoutConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  pendingCount?: number;
  loading?: boolean;
}

const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  onConfirm,
  onCancel,
  pendingCount = 0,
  loading = false,
}) => {
  const { t, language } = useLanguage();

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
            {pendingCount > 0
              ? language === "en"
                ? `${pendingCount} local changes remain. They will be synced first; any that still fail will be removed from this device.`
                : `仍有 ${pendingCount} 条本地变更。退出前会先尝试同步，未成功的变更将从此设备移除。`
              : t("confirmLogoutMessage") || "确定要退出登录吗？"}
          </p>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              onClick={onCancel}
              variant="ghost"
              disabled={loading}
            >
              {t("cancel") || "取消"}
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onConfirm();
              }}
            >
              {loading ? t("loading") || "处理中..." : t("confirm") || "确认"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutConfirmDialog;
