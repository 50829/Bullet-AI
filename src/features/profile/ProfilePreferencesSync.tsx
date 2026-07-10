"use client";

import { useEffect } from "react";
import { usePreferences } from "../../lib/profile/PreferencesContext";
import { useProfile } from "./ProfileContext";

export function ProfilePreferencesSync() {
  const { profile } = useProfile();
  const { replacePreferences } = usePreferences();

  useEffect(() => {
    if (profile) replacePreferences(profile.preferences);
  }, [profile, replacePreferences]);

  return null;
}
