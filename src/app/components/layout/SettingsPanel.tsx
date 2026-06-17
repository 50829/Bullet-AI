"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Languages, Moon, Palette, Sun, Monitor, User, X } from "lucide-react";
import { useLanguage, type Language } from "../../context/LanguageContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useToast } from "../ui/Toast";
import {
  getCurrentUserProfile,
  updateCurrentUserDisplayName,
  updateCurrentUserPreferences,
  type UserProfile,
} from "../../../lib/profile/profileService";
import {
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  writeLocalPreferences,
  type AccentColor,
  type ColorScheme,
  type UserPreferences,
} from "../../../lib/profile/preferences";

type SettingsPanelProps = {
  onClose: () => void;
  initialProfile?: UserProfile | null;
  onProfileUpdate?: (profile: UserProfile) => void;
};

type SettingsSection = "user" | "appearance" | "language";
type FormMessage = { type: "success" | "error" | "info"; text: string } | null;

const ACCENT_OPTIONS: Array<{
  id: AccentColor;
  labelZh: string;
  labelEn: string;
  color: string;
}> = [
  { id: "sage", labelZh: "鼠尾草", labelEn: "Sage", color: "#2f6f5e" },
  { id: "green", labelZh: "森林绿", labelEn: "Forest", color: "#2f7d52" },
  { id: "purple", labelZh: "雾紫", labelEn: "Mauve", color: "#7c5c9e" },
  { id: "amber", labelZh: "琥珀", labelEn: "Amber", color: "#a16207" },
];

const COLOR_SCHEME_OPTIONS: Array<{
  id: ColorScheme;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  Icon: typeof Monitor;
}> = [
  {
    id: "system",
    labelZh: "跟随系统",
    labelEn: "System",
    descriptionZh: "跟随设备明暗模式",
    descriptionEn: "Match device appearance",
    Icon: Monitor,
  },
  {
    id: "light",
    labelZh: "浅色",
    labelEn: "Light",
    descriptionZh: "稳定明亮的工作台",
    descriptionEn: "Bright steady workspace",
    Icon: Sun,
  },
  {
    id: "dark",
    labelZh: "深色",
    labelEn: "Dark",
    descriptionZh: "低亮度长时间使用",
    descriptionEn: "Lower brightness for long sessions",
    Icon: Moon,
  },
];

function getUsernameTimestamp(profile: Pick<UserProfile, "username_updated_at" | "updated_at">) {
  return profile.username_updated_at || profile.updated_at;
}

export default function SettingsPanel({
  onClose,
  initialProfile,
  onProfileUpdate,
}: SettingsPanelProps) {
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>("user");
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPreference, setSavingPreference] = useState<keyof UserPreferences | null>(null);
  const [message, setMessage] = useState<FormMessage>(null);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const applyProfileState = useCallback((nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setCurrentUsername(nextProfile.username || "");
    setUsername(nextProfile.username || "");
    setPreferences(normalizePreferences(nextProfile.preferences));

    const usernameUpdatedAt = getUsernameTimestamp(nextProfile);
    if (usernameUpdatedAt) {
      const lastUpdate = new Date(usernameUpdatedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 3) {
        setCanChangeUsername(false);
        setDaysRemaining(3 - diffDays);
        return;
      }
    }

    setCanChangeUsername(true);
    setDaysRemaining(0);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (initialProfile) {
      applyProfileState(initialProfile);
      return () => {
        isMounted = false;
      };
    }

    getCurrentUserProfile()
      .then((nextProfile) => {
        if (!isMounted) return;
        if (!nextProfile) {
          onClose();
          return;
        }
        applyProfileState(nextProfile);
      })
      .catch((error) => {
        console.error("Failed to load profile:", error);
        showToast({
          type: "error",
          message: language === "en" ? "Failed to load settings." : "设置加载失败。",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [applyProfileState, initialProfile, language, onClose, showToast]);

  const savePreferences = useCallback(
    async (nextPartial: Partial<UserPreferences>, savingKey: keyof UserPreferences) => {
      const nextPreferences = normalizePreferences({ ...preferences, ...nextPartial });
      setPreferences(nextPreferences);
      writeLocalPreferences(nextPreferences);
      setSavingPreference(savingKey);

      try {
        const savedPreferences = await updateCurrentUserPreferences(nextPartial);
        const mergedPreferences = normalizePreferences(savedPreferences);
        setPreferences(mergedPreferences);
        writeLocalPreferences(mergedPreferences);
        setProfile((current) =>
          current
            ? {
                ...current,
                preferences: mergedPreferences,
                preferences_updated_at: new Date().toISOString(),
              }
            : current,
        );
        showToast({
          type: "success",
          message: language === "en" ? "Preference saved." : "偏好已保存。",
        });
      } catch (error) {
        console.error("Failed to save preferences:", error);
        showToast({
          type: "error",
          message:
            language === "en"
              ? "Saved locally. Cloud sync failed and will need retry."
              : "已在本地生效，云端同步失败，稍后需要重试。",
        });
      } finally {
        setSavingPreference(null);
      }
    },
    [language, preferences, showToast],
  );

  const handleUsernameChange = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextUsername = username.trim();
    if (nextUsername === currentUsername) {
      setMessage({ type: "info", text: t("usernameUnchanged") });
      return;
    }

    if (!canChangeUsername) {
      setMessage({
        type: "error",
        text: t("usernameChangeCooldown").replace("{days}", daysRemaining.toString()),
      });
      return;
    }

    setSavingUsername(true);
    setMessage(null);

    try {
      const updatedProfile = await updateCurrentUserDisplayName(nextUsername);
      applyProfileState(updatedProfile);
      setMessage({ type: "success", text: t("updateSuccess") });
      onProfileUpdate?.(updatedProfile);
      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: { username: updatedProfile.username },
        }),
      );
    } catch (error) {
      console.error("Failed to update display name:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("updateError"),
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    void savePreferences({ preferred_language: nextLanguage }, "preferred_language");
  };

  const handleAccentChange = (accentColor: AccentColor) => {
    void savePreferences({ ui_theme: "calm", accent_color: accentColor }, "accent_color");
  };

  const handleColorSchemeChange = (colorScheme: ColorScheme) => {
    void savePreferences({ color_scheme: colorScheme }, "color_scheme");
  };

  const sectionButton = (section: SettingsSection, Icon: typeof User, label: string) => {
    const isActive = activeSection === section;
    return (
      <button
        type="button"
        onClick={() => setActiveSection(section)}
        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none ${
          isActive
            ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
        }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/35 transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-muted)] px-5 py-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {t("settings")}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {language === "en"
                  ? "Local-first preferences, synced quietly in the background."
                  : "偏好先本地生效，再安静同步到云端。"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)] motion-reduce:transition-none"
              aria-label={t("close")}
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <aside className="border-b border-[var(--color-border-muted)] p-3 md:w-64 md:border-b-0 md:border-r">
              <nav className="grid grid-cols-3 gap-2 md:grid-cols-1">
                {sectionButton("user", User, t("user"))}
                {sectionButton("appearance", Palette, t("appearance"))}
                {sectionButton("language", Languages, language === "en" ? "Language" : "语言")}
              </nav>
            </aside>

            <main className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
              {activeSection === "user" && (
                <section className="max-w-2xl">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {t("userSettings")}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {language === "en"
                      ? "Display name is optional and only affects how BulletAI greets you."
                      : "显示名称是可选的，只用于 BulletAI 在界面中称呼你。"}
                  </p>

                  <form onSubmit={handleUsernameChange} className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                        {language === "en" ? "Display name" : "显示名称"}
                      </span>
                      <Input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder={
                          language === "en"
                            ? "How should BulletAI call you?"
                            : "BulletAI 可以怎么称呼你？"
                        }
                        disabled={savingUsername || !canChangeUsername}
                        maxLength={20}
                      />
                    </label>

                    {!canChangeUsername && (
                      <p className="text-sm text-[var(--color-warning)]">
                        {t("usernameChangeCooldown").replace("{days}", daysRemaining.toString())}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="submit"
                        disabled={savingUsername || !canChangeUsername || username.trim() === currentUsername}
                      >
                        {savingUsername ? t("saving") : t("save")}
                      </Button>
                      {profile && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {language === "en" ? "Signed in profile settings" : "当前登录账户设置"}
                        </span>
                      )}
                    </div>
                  </form>

                  {message && (
                    <p
                      className={`mt-4 text-sm ${
                        message.type === "success"
                          ? "text-[var(--color-success)]"
                          : message.type === "error"
                            ? "text-[var(--color-danger)]"
                            : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {message.text}
                    </p>
                  )}
                </section>
              )}

              {activeSection === "appearance" && (
                <section className="max-w-3xl">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {t("appearance")}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {language === "en"
                      ? "BulletAI now uses one calm interface style. Accent color is only used for key actions and selection states."
                      : "BulletAI 现在只保留一套安静稳定的界面风格，强调色只用于关键操作和选中状态。"}
                  </p>

                  <div className="mt-5 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] p-4">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {language === "en" ? "Calm workspace" : "Calm 工作台"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {language === "en"
                            ? "Neutral surfaces, clear borders, short motion."
                            : "中性背景、清晰边界、短促反馈。"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[var(--color-primary)]" />
                        <span className="h-3 w-3 rounded-full bg-[var(--color-success)]" />
                        <span className="h-3 w-3 rounded-full bg-[var(--color-warning)]" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {t("colorMode")}
                    </h4>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {COLOR_SCHEME_OPTIONS.map((option) => {
                        const selected = preferences.color_scheme === option.id;
                        const Icon = option.Icon;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleColorSchemeChange(option.id)}
                            disabled={savingPreference === "color_scheme"}
                            className={`rounded-xl border p-4 text-left transition-colors duration-150 hover:bg-[var(--color-bg-primary)] disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${
                              selected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                                : "border-[var(--color-border-muted)] bg-[var(--color-bg-surface)]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                                <Icon size={16} />
                                {language === "en" ? option.labelEn : option.labelZh}
                              </span>
                              {selected && <Check size={16} className="text-[var(--color-primary)]" />}
                            </div>
                            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                              {language === "en" ? option.descriptionEn : option.descriptionZh}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {t("accentColor")}
                    </h4>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {ACCENT_OPTIONS.map((option) => {
                        const selected = preferences.accent_color === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleAccentChange(option.id)}
                            disabled={savingPreference === "accent_color"}
                            className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors duration-150 hover:bg-[var(--color-bg-primary)] disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${
                              selected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                                : "border-[var(--color-border-muted)] bg-[var(--color-bg-surface)]"
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <span
                                className="h-6 w-6 rounded-full border border-black/10"
                                style={{ backgroundColor: option.color }}
                              />
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                {language === "en" ? option.labelEn : option.labelZh}
                              </span>
                            </span>
                            {selected && <Check size={16} className="text-[var(--color-primary)]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "language" && (
                <section className="max-w-2xl">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {language === "en" ? "Language" : "语言设置"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {language === "en"
                      ? "Language changes immediately and syncs to your profile in the background."
                      : "语言会立即切换，并在后台同步到你的账户偏好。"}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { id: "zh" as const, label: "中文", description: "使用中文界面" },
                      { id: "en" as const, label: "English", description: "Use the English interface" },
                    ].map((option) => {
                      const selected = language === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleLanguageChange(option.id)}
                          disabled={savingPreference === "preferred_language"}
                          className={`rounded-xl border p-4 text-left transition-colors duration-150 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${
                            selected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                              : "border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-primary)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              {option.label}
                            </span>
                            {selected && (
                              <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-on-primary)]">
                                {language === "en" ? "Active" : "当前"}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
