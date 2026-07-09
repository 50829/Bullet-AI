import { supabase } from "../supabase/client";
import { getCollectionRepository } from "../localDb/collectionRepository";
import {
  findRemoteCollectionRow,
  readRemoteCollection,
} from "../localDb/remoteReader";
import { flushOutbox } from "../localDb/syncEngine";
import {
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  type UserPreferences,
} from "./preferences";

export type UserProfile = {
  username: string;
  username_updated_at: string | null;
  updated_at: string | null;
  preferences_updated_at: string | null;
  preferences: UserPreferences;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
  username_updated_at: string | null;
  updated_at: string | null;
  preferences_updated_at: string | null;
  preferred_language: string | null;
  ui_theme: string | null;
  accent_color: string | null;
  color_scheme: string | null;
  completed_goal_retention: string | null;
  week_starts_on: string | null;
};

const profileRepository = getCollectionRepository<ProfileRow>("profiles");

async function getCurrentUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);
  return session?.user ?? null;
}

function profileFromRow(row: Partial<ProfileRow> | null | undefined) {
  return {
    username: row?.username || "",
    username_updated_at: row?.username_updated_at || row?.updated_at || null,
    updated_at: row?.updated_at || null,
    preferences_updated_at: row?.preferences_updated_at || null,
    preferences: normalizePreferences({
      preferred_language:
        row?.preferred_language ?? DEFAULT_USER_PREFERENCES.preferred_language,
      ui_theme: row?.ui_theme ?? DEFAULT_USER_PREFERENCES.ui_theme,
      accent_color: row?.accent_color ?? DEFAULT_USER_PREFERENCES.accent_color,
      color_scheme: row?.color_scheme ?? DEFAULT_USER_PREFERENCES.color_scheme,
      completed_goal_retention:
        row?.completed_goal_retention ??
        DEFAULT_USER_PREFERENCES.completed_goal_retention,
      week_starts_on:
        row?.week_starts_on ?? DEFAULT_USER_PREFERENCES.week_starts_on,
    }),
  } satisfies UserProfile;
}

function rowFromProfile(
  userId: string,
  profile: UserProfile | null | undefined,
  updates: Partial<ProfileRow>,
): ProfileRow {
  const preferences = normalizePreferences({
    ...(profile?.preferences ?? DEFAULT_USER_PREFERENCES),
    preferred_language: updates.preferred_language,
    ui_theme: updates.ui_theme,
    accent_color: updates.accent_color,
    color_scheme: updates.color_scheme,
    completed_goal_retention: updates.completed_goal_retention,
    week_starts_on: updates.week_starts_on,
  });

  return {
    user_id: userId,
    username: updates.username ?? profile?.username ?? null,
    username_updated_at:
      updates.username_updated_at ?? profile?.username_updated_at ?? null,
    updated_at: updates.updated_at ?? profile?.updated_at ?? null,
    preferences_updated_at:
      updates.preferences_updated_at ?? profile?.preferences_updated_at ?? null,
    preferred_language: preferences.preferred_language,
    ui_theme: preferences.ui_theme,
    accent_color: preferences.accent_color,
    color_scheme: preferences.color_scheme,
    completed_goal_retention: preferences.completed_goal_retention,
    week_starts_on: preferences.week_starts_on,
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const cached = await profileRepository.list(user.id);

  try {
    const remoteProfiles = await readRemoteCollection<ProfileRow>(
      user.id,
      "profiles",
    );
    const rows = await profileRepository.replaceRemote(user.id, remoteProfiles);
    return profileFromRow(rows[0] ?? cached[0]);
  } catch (error) {
    if (cached[0]) return profileFromRow(cached[0]);
    throw error;
  }
}

export async function updateCurrentUserDisplayName(
  displayName: string,
): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const username = displayName.trim();
  const currentProfile = await getCurrentUserProfile();

  if (username) {
    const existing = await findRemoteCollectionRow<ProfileRow>(
      "profiles",
      "username",
      username,
    );

    if (existing && existing.user_id !== user.id) {
      throw new Error("该用户名已被使用，请选择其他用户名");
    }
  }

  const updatedAt = new Date().toISOString();
  const row = rowFromProfile(user.id, currentProfile, {
    username: username || null,
    username_updated_at: updatedAt,
    updated_at: updatedAt,
  });

  await profileRepository.mutate(user.id, row, "upsert");
  void flushOutbox();

  return profileFromRow(row);
}

export async function updateCurrentUserPreferences(
  preferences: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const currentProfile = await getCurrentUserProfile();
  const nextPreferences = normalizePreferences({
    ...(currentProfile?.preferences ?? DEFAULT_USER_PREFERENCES),
    ...preferences,
  });

  const row = rowFromProfile(user.id, currentProfile, {
    preferred_language: nextPreferences.preferred_language,
    ui_theme: nextPreferences.ui_theme,
    accent_color: nextPreferences.accent_color,
    color_scheme: nextPreferences.color_scheme,
    completed_goal_retention: nextPreferences.completed_goal_retention,
    week_starts_on: nextPreferences.week_starts_on,
    preferences_updated_at: new Date().toISOString(),
  });

  await profileRepository.mutate(user.id, row, "upsert");
  void flushOutbox();

  return nextPreferences;
}
