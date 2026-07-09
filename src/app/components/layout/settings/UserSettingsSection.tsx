"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "../../ui/Button";
import { FieldLabel } from "../../ui/FieldLabel";
import { Input } from "../../ui/Input";
import { useLanguage } from "../../../context/LanguageContext";
import type { FormMessage } from "./types";

type UserSettingsSectionProps = {
  username: string;
  currentUsername: string;
  savingUsername: boolean;
  canChangeUsername: boolean;
  daysRemaining: number;
  message: FormMessage;
  onUsernameChange: Dispatch<SetStateAction<string>>;
  onSubmit: (event: FormEvent) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
};

export function UserSettingsSection({
  username,
  currentUsername,
  savingUsername,
  canChangeUsername,
  daysRemaining,
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
            disabled={savingUsername || !canChangeUsername}
            maxLength={20}
          />
        </div>

        {!canChangeUsername && (
          <p className="text-sm text-[var(--color-warning)]">
            {t("usernameChangeCooldown").replace(
              "{days}",
              daysRemaining.toString(),
            )}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={
              savingUsername ||
              !canChangeUsername ||
              username.trim() === currentUsername
            }
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
