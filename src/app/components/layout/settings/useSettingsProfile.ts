"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLanguage, type Language } from "../../../../shared/i18n/LanguageContext";
import { useToast } from "../../../../shared/components/ui/Toast";
import {
  getCurrentUserProfile,
  updateCurrentUserDisplayName,
  updateCurrentUserPreferences,
  type UserProfile,
} from "../../../../lib/profile/profileService";
import {
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  writeLocalPreferences,
  type AccentColor,
  type ColorScheme,
  type CompletedGoalRetention,
  type UserPreferences,
  type WeekStartsOnPreference,
} from "../../../../lib/profile/preferences";
import { useWorkspaceSessionContext } from "../../../../features/workspace/WorkspaceContext";
import { supabase } from "../../../../lib/supabaseClient";
import type { FormMessage } from "./types";

type UseSettingsProfileInput = {
  onClose: () => void;
  initialProfile?: UserProfile | null;
  onProfileUpdate?: (profile: UserProfile) => void;
};

function getUsernameTimestamp(
  profile: Pick<UserProfile, "username_updated_at" | "updated_at">,
) {
  return profile.username_updated_at || profile.updated_at;
}

export function useSettingsProfile({
  onClose,
  initialProfile,
  onProfileUpdate,
}: UseSettingsProfileInput) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const { syncStatus, deadOutboxCount, retrySync } =
    useWorkspaceSessionContext();
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
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const applyProfileState = useCallback((nextProfile: UserProfile) => {
    setCurrentUsername(nextProfile.username || "");
    setUsername(nextProfile.username || "");
    setPreferences(normalizePreferences(nextProfile.preferences));

    const usernameUpdatedAt = getUsernameTimestamp(nextProfile);
    if (usernameUpdatedAt) {
      const lastUpdate = new Date(usernameUpdatedAt);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
      );

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
          message:
            language === "en" ? "Failed to load settings." : "设置加载失败。",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [applyProfileState, initialProfile, language, onClose, showToast]);

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
      writeLocalPreferences(nextPreferences);
      setSavingPreference(savingKey);

      try {
        const savedPreferences =
          await updateCurrentUserPreferences(nextPartial);
        const mergedPreferences = normalizePreferences(savedPreferences);
        setPreferences(mergedPreferences);
        writeLocalPreferences(mergedPreferences);
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
    [language, preferences, showToast],
  );

  const handleUsernameChange = async (event: FormEvent) => {
    event.preventDefault();

    const nextUsername = username.trim();
    if (nextUsername === currentUsername) return;

    if (!canChangeUsername) {
      setMessage({
        type: "error",
        text: t("usernameChangeCooldown").replace(
          "{days}",
          daysRemaining.toString(),
        ),
      });
      return;
    }

    setSavingUsername(true);
    setMessage(null);

    try {
      const updatedProfile = await updateCurrentUserDisplayName(nextUsername);
      applyProfileState(updatedProfile);
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast({
        type: "error",
        message:
          language === "en"
            ? `Failed to log out: ${error.message}`
            : `退出登录失败: ${error.message}`,
      });
      return;
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
    canChangeUsername,
    daysRemaining,
    syncStatus,
    deadOutboxCount,
    retrySync,
    handleUsernameChange,
    handleLanguageChange,
    handleAccentChange,
    handleColorSchemeChange,
    handleCompletedGoalRetentionChange,
    handleWeekStartsOnChange,
    handleLogout,
  };
}
