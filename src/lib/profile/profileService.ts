import { supabase } from "../supabase/client";
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

const PROFILE_SELECT =
  "user_id,username,username_updated_at,updated_at,preferences_updated_at,preferred_language,ui_theme,accent_color,color_scheme,completed_goal_retention,week_starts_on";

async function getCurrentUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);
  return session?.user ?? null;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    username: data?.username || "",
    username_updated_at: data?.username_updated_at || data?.updated_at || null,
    updated_at: data?.updated_at || null,
    preferences_updated_at: data?.preferences_updated_at || null,
    preferences: normalizePreferences({
      preferred_language:
        data?.preferred_language ?? DEFAULT_USER_PREFERENCES.preferred_language,
      ui_theme: data?.ui_theme ?? DEFAULT_USER_PREFERENCES.ui_theme,
      accent_color: data?.accent_color ?? DEFAULT_USER_PREFERENCES.accent_color,
      color_scheme: data?.color_scheme ?? DEFAULT_USER_PREFERENCES.color_scheme,
      completed_goal_retention:
        data?.completed_goal_retention ??
        DEFAULT_USER_PREFERENCES.completed_goal_retention,
      week_starts_on:
        data?.week_starts_on ?? DEFAULT_USER_PREFERENCES.week_starts_on,
    }),
  };
}

export async function updateCurrentUserDisplayName(
  displayName: string,
): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const username = displayName.trim();
  const currentProfile = await getCurrentUserProfile();

  if (username) {
    const { data: existing, error: existingError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing && existing.user_id !== user.id) {
      throw new Error("该用户名已被使用，请选择其他用户名");
    }
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      username: username || null,
      username_updated_at: updatedAt,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);

  return {
    username,
    username_updated_at: updatedAt,
    updated_at: updatedAt,
    preferences_updated_at: currentProfile?.preferences_updated_at ?? null,
    preferences: currentProfile?.preferences ?? DEFAULT_USER_PREFERENCES,
  };
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

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      username: currentProfile?.username || null,
      preferred_language: nextPreferences.preferred_language,
      ui_theme: nextPreferences.ui_theme,
      accent_color: nextPreferences.accent_color,
      color_scheme: nextPreferences.color_scheme,
      completed_goal_retention: nextPreferences.completed_goal_retention,
      week_starts_on: nextPreferences.week_starts_on,
      preferences_updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);

  return nextPreferences;
}
