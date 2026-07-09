import {
  getCurrentUserProfile,
  type UserProfile,
} from "../../lib/profile/profileService";
import {
  writeLocalPreferences,
  type PreferredLanguage,
} from "../../lib/profile/preferences";

type ApplyLanguage = (language: PreferredLanguage) => void;

export async function syncCurrentUserPreferences(
  applyLanguage: ApplyLanguage,
): Promise<UserProfile | null> {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;

  writeLocalPreferences(profile.preferences);
  applyLanguage(profile.preferences.preferred_language);
  return profile;
}
