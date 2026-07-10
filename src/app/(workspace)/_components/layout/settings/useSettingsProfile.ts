"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLanguage, type Language } from "@/shared/i18n/LanguageContext";
import { useToast } from "@/shared/components/ui/Toast";
import { usePreferences } from "@/lib/profile/PreferencesContext";
import { useProfile } from "@/features/profile/ProfileContext";
import { type UserProfile } from "@/lib/profile/profileService";
import {
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  type AccentColor,
  type ColorScheme,
  type CompletedGoalRetention,
  type UserPreferences,
  type WeekStartsOnPreference,
} from "@/lib/profile/preferences";
import { useWorkspaceSessionContext } from "@/features/workspace/WorkspaceContext";
import { signOutAndClearLocalData } from "@/features/workspace/logout";
import type { FormMessage } from "./types";
import { useDataRuntime } from "@/data";

type UseSettingsProfileInput = {
  onClose: () => void;
};

export function useSettingsProfile({ onClose }: UseSettingsProfileInput) {
  const { t, language } = useLanguage();
  const { updatePreferences: updateLocalPreferences, replacePreferences } =
    usePreferences();
  const {
    profile,
    loading: profileLoading,
    updateUsername,
    updatePreferences: updateCloudPreferences,
  } = useProfile();
  const router = useRouter();
  const { store, worker } = useDataRuntime();
  const {
    userId,
    syncStatus,
    pendingCount,
    syncIssues,
    retrySync,
    retrySyncItem,
    discardSyncItem,
    resolveSyncConflict,
  } = useWorkspaceSessionContext();
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>(
    DEFAULT_USER_PREFERENCES,
  );
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPreference, setSavingPreference] = useState<
    keyof UserPreferences | null
  >(null);
  const [message, setMessage] = useState<FormMessage>(null);

  const applyProfileState = useCallback((nextProfile: UserProfile) => {
    setCurrentUsername(nextProfile.username || "");
    setUsername(nextProfile.username || "");
    setPreferences(normalizePreferences(nextProfile.preferences));
  }, []);

  useEffect(() => {
    if (profile) {
      applyProfileState(profile);
      return;
    }

    if (!profileLoading) {
      onClose();
      showToast({
        type: "error",
        message:
          language === "en" ? "Failed to load settings." : "设置加载失败。",
      });
    }
  }, [
    applyProfileState,
    language,
    onClose,
    profile,
    profileLoading,
    showToast,
  ]);

  const savePreferences = useCallback(
    async (
      nextPartial: Partial<UserPreferences>,
      savingKey: keyof UserPreferences,
    ) => {
      const nextPreferences = normalizePreferences({
        ...preferences,
        ...nextPartial,
      });
      setPreferences(nextPreferences);
      updateLocalPreferences(nextPreferences);
      setSavingPreference(savingKey);

      try {
        const savedPreferences = await updateCloudPreferences(nextPartial);
        const mergedPreferences = normalizePreferences(savedPreferences);
        setPreferences(mergedPreferences);
        replacePreferences(mergedPreferences);
      } catch (error) {
        console.error("Failed to save preferences:", error);
        showToast({
          type: "error",
          message:
            language === "en"
              ? "Cloud sync failed. Please retry."
              : "云端同步失败，请重试。",
        });
      } finally {
        setSavingPreference(null);
      }
    },
    [
      language,
      preferences,
      replacePreferences,
      showToast,
      updateCloudPreferences,
      updateLocalPreferences,
    ],
  );

  const handleUsernameChange = async (event: FormEvent) => {
    event.preventDefault();

    const nextUsername = username.trim();
    if (nextUsername === currentUsername) return;

    setSavingUsername(true);
    setMessage(null);

    try {
      const updatedProfile = await updateUsername(nextUsername);
      applyProfileState(updatedProfile);
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
    void savePreferences(
      { preferred_language: nextLanguage },
      "preferred_language",
    );
  };

  const handleAccentChange = (accentColor: AccentColor) => {
    void savePreferences(
      { ui_theme: "calm", accent_color: accentColor },
      "accent_color",
    );
  };

  const handleColorSchemeChange = (colorScheme: ColorScheme) => {
    void savePreferences({ color_scheme: colorScheme }, "color_scheme");
  };

  const handleCompletedGoalRetentionChange = (
    completedGoalRetention: CompletedGoalRetention,
  ) => {
    void savePreferences(
      { completed_goal_retention: completedGoalRetention },
      "completed_goal_retention",
    );
  };

  const handleWeekStartsOnChange = (
    weekStartsOn: Exclude<WeekStartsOnPreference, "auto">,
  ) => {
    void savePreferences({ week_starts_on: weekStartsOn }, "week_starts_on");
  };

  const handleLogout = async () => {
    const { error } = await signOutAndClearLocalData({
      userId,
      store,
      worker,
    });
    if (error) {
      showToast({
        type: "error",
        message:
          language === "en"
            ? `Failed to log out: ${error.message}`
            : `退出登录失败: ${error.message}`,
      });
      throw error;
    }

    onClose();
    router.replace("/");
  };

  return {
    language,
    username,
    setUsername,
    currentUsername,
    preferences,
    savingUsername,
    savingPreference,
    message,
    syncStatus,
    pendingCount,
    syncIssues,
    retrySync,
    retrySyncItem,
    discardSyncItem,
    resolveSyncConflict,
    handleUsernameChange,
    handleLanguageChange,
    handleAccentChange,
    handleColorSchemeChange,
    handleCompletedGoalRetentionChange,
    handleWeekStartsOnChange,
    handleLogout,
  };
}
