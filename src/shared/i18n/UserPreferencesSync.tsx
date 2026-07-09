"use client";

import { useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import { writeLocalPreferences } from "../../lib/profile/preferences";
import { getCurrentUserProfile } from "../../lib/profile/profileService";

export function UserPreferencesSync() {
  const { setLanguage } = useLanguage();

  useEffect(() => {
    let isMounted = true;

    getCurrentUserProfile()
      .then((profile) => {
        if (!isMounted || !profile) return;

        writeLocalPreferences(profile.preferences);
        setLanguage(profile.preferences.preferred_language);
      })
      .catch((error) => {
        console.error("Failed to sync user preferences:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [setLanguage]);

  return null;
}
