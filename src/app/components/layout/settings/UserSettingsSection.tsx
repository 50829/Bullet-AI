"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Button } from "../../../../shared/components/ui/Button";
import { FieldLabel } from "../../../../shared/components/ui/FieldLabel";
import { Input } from "../../../../shared/components/ui/Input";
import { useLanguage } from "../../../../shared/i18n/LanguageContext";
import type { FormMessage } from "./types";
import { ConfirmDialog } from "../../../../shared/components/ui/ConfirmDialog";

type UserSettingsSectionProps = {
  username: string;
  currentUsername: string;
  savingUsername: boolean;
  message: FormMessage;
  onUsernameChange: Dispatch<SetStateAction<string>>;
  onSubmit: (event: FormEvent) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  pendingCount: number;
};

export function UserSettingsSection({
  username,
  currentUsername,
  savingUsername,
  message,
  onUsernameChange,
  onSubmit,
  onLogout,
  pendingCount,
}: UserSettingsSectionProps) {
  const { t, language } = useLanguage();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
      setConfirmingLogout(false);
    } catch {
      // The settings hook already reports the actionable error through a toast.
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <section className="max-w-2xl">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
        {t("userSettings")}
      </h3>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <FieldLabel className="mb-2">
            {language === "en" ? "Display name" : "显示名称"}
          </FieldLabel>
          <Input
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder={language === "en" ? "Display name" : "显示名称"}
            disabled={savingUsername}
            maxLength={20}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={savingUsername || username.trim() === currentUsername}
          >
            {savingUsername ? t("saving") : t("save")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmingLogout(true)}
          >
            {t("logout") || "退出登录"}
          </Button>
        </div>
      </form>

      {message && (
        <p className="mt-4 text-sm text-[var(--color-danger)]">
          {message.text}
        </p>
      )}

      <ConfirmDialog
        isOpen={confirmingLogout}
        title={language === "en" ? "Log out?" : "退出登录？"}
        description={
          pendingCount > 0
            ? language === "en"
              ? `${pendingCount} local changes remain. They will be synced first; any that still fail will be removed from this device.`
              : `仍有 ${pendingCount} 条本地变更。退出前会先尝试同步，未成功的变更将从此设备移除。`
            : language === "en"
              ? "Local workspace data will be removed from this device."
              : "此设备上的本地工作区数据将被移除。"
        }
        confirmLabel={language === "en" ? "Log out" : "退出"}
        cancelLabel={language === "en" ? "Cancel" : "取消"}
        loading={loggingOut}
        tone="danger"
        onConfirm={() => void confirmLogout()}
        onCancel={() => setConfirmingLogout(false)}
      />
    </section>
  );
}
