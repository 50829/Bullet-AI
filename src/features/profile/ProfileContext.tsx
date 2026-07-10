"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { ProfileEntity } from "../../domain/entities";
import { useDataMutation, useDataResource } from "@/data";
import { loadRemoteProfiles } from "../../data/supabase";
import { useAuthSession } from "../../lib/auth/AuthSessionContext";
import {
  profileEntityToUserProfile,
  type UserProfile,
} from "../../lib/profile/profileService";
import {
  normalizePreferences,
  type UserPreferences,
} from "../../lib/profile/preferences";

type ProfileContextValue = {
  userId: string | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  updateUsername: (username: string) => Promise<UserProfile>;
  updatePreferences: (
    preferences: Partial<UserPreferences>,
  ) => Promise<UserPreferences>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);

function mutationChanges(entity: ProfileEntity) {
  return {
    username: entity.username,
    preferredLanguage: entity.preferredLanguage,
    accentColor: entity.accentColor,
    colorScheme: entity.colorScheme,
    completedGoalRetention: entity.completedGoalRetention,
    weekStartsOn: entity.weekStartsOn,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { userId, ready } = useAuthSession();
  const resource = useDataResource(userId, "profiles", {
    remoteLoader: userId ? () => loadRemoteProfiles(userId) : undefined,
  });
  const mutation = useDataMutation(userId ?? "anonymous", "profiles");
  const profileRecord = resource.data?.[0] ?? null;
  const entity = profileRecord?.entity ?? null;
  const profile = useMemo(() => profileEntityToUserProfile(entity), [entity]);

  const enqueueProfile = useCallback(
    async (optimistic: ProfileEntity) => {
      if (!userId) throw new Error("请先登录");
      if (!entity) {
        throw new Error("账户资料尚未加载，请联网后重试");
      }
      if (
        profileRecord?.sync.status === "blocked" ||
        profileRecord?.sync.status === "conflict"
      ) {
        throw new Error("请先在数据设置中处理账户资料的同步冲突");
      }
      await mutation.mutateAsync({
        kind: "patch",
        clientId: userId,
        baseVersion: entity.version,
        optimistic,
        changes: mutationChanges(optimistic),
      });
      return profileEntityToUserProfile(optimistic)!;
    },
    [entity, mutation, profileRecord?.sync.status, userId],
  );

  const refreshProfile = useCallback(async () => {
    if (!userId) return null;
    const result = await resource.refetch();
    if (!result.data) return null;
    return profileEntityToUserProfile(result.data[0]?.entity);
  }, [resource, userId]);

  const updateUsername = useCallback(
    async (username: string) => {
      if (!userId) throw new Error("请先登录");
      if (!entity) throw new Error("账户资料尚未加载，请联网后重试");
      const current = entity;
      const now = new Date().toISOString();
      return enqueueProfile({
        ...current,
        username: username.trim(),
        updatedAt: now,
      });
    },
    [enqueueProfile, entity, userId],
  );

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!userId) throw new Error("请先登录");
      if (!entity) throw new Error("账户资料尚未加载，请联网后重试");
      const current = entity;
      const next = normalizePreferences({
        ...(profile?.preferences ?? {}),
        ...updates,
      });
      const nextProfile = await enqueueProfile({
        ...current,
        preferredLanguage: next.preferred_language,
        accentColor: next.accent_color,
        colorScheme: next.color_scheme,
        completedGoalRetention: next.completed_goal_retention,
        weekStartsOn: next.week_starts_on,
        updatedAt: new Date().toISOString(),
      });
      return nextProfile.preferences;
    },
    [enqueueProfile, entity, profile?.preferences, userId],
  );

  const value = useMemo(
    () => ({
      userId,
      profile,
      loading: !ready || (Boolean(userId) && resource.isLoading),
      refreshProfile,
      updateUsername,
      updatePreferences,
    }),
    [
      profile,
      ready,
      refreshProfile,
      resource.isLoading,
      updatePreferences,
      updateUsername,
      userId,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return context;
}
