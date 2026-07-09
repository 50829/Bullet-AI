"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "../../../../shared/components/ui/Button";
import { FieldLabel } from "../../../../shared/components/ui/FieldLabel";
import { Input } from "../../../../shared/components/ui/Input";
import { useLanguage } from "../../../../shared/i18n/LanguageContext";
import type { FormMessage } from "./types";

type UserSettingsSectionProps = {
  username: string;
  currentUsername: string;
  savingUsername: boolean;
  message: FormMessage;
  onUsernameChange: Dispatch<SetStateAction<string>>;
  onSubmit: (event: FormEvent) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
};

export function UserSettingsSection({
  username,
  currentUsername,
  savingUsername,
  message,
  onUsernameChange,
  onSubmit,
  onLogout,
}: UserSettingsSectionProps) {
  const { t, language } = useLanguage();

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
            onClick={() => void onLogout()}
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
    </section>
  );
}
