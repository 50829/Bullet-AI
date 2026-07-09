"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../supabaseClient";
import {
  getCurrentUserProfile,
  updateUserDisplayName,
  updateUserPreferences,
  type UserProfile,
} from "./profileService";
import { type UserPreferences } from "./preferences";

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

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let requestId = 0;

    const loadProfile = async (nextUserId: string | null) => {
      const currentRequestId = ++requestId;
      setUserId(nextUserId);

      if (!nextUserId) {
        if (!isMounted || currentRequestId !== requestId) return;
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const nextProfile = await getCurrentUserProfile();
        if (!isMounted || currentRequestId !== requestId) return;
        setProfile(nextProfile);
      } catch (error) {
        console.error("Failed to load profile:", error);
        if (!isMounted || currentRequestId !== requestId) return;
        setProfile(null);
      } finally {
        if (isMounted && currentRequestId === requestId) setLoading(false);
      }
    };

    const loadSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await loadProfile(session?.user?.id ?? null);
      } catch (error) {
        console.error("Failed to load auth session:", error);
        if (!isMounted) return;
        setUserId(null);
        setProfile(null);
        setLoading(false);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      requestId += 1;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const nextProfile = await getCurrentUserProfile();
      setProfile(nextProfile);
      return nextProfile;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUsername = useCallback(
    async (username: string) => {
      if (!userId) throw new Error("请先登录");
      const nextProfile = await updateUserDisplayName(
        userId,
        profile,
        username,
      );
      setProfile(nextProfile);
      return nextProfile;
    },
    [profile, userId],
  );

  const updatePreferences = useCallback(
    async (preferences: Partial<UserPreferences>) => {
      if (!userId) throw new Error("请先登录");
      const nextProfile = await updateUserPreferences(
        userId,
        profile,
        preferences,
      );
      setProfile(nextProfile);
      return nextProfile.preferences;
    },
    [profile, userId],
  );

  const value = useMemo(
    () => ({
      userId,
      profile,
      loading,
      refreshProfile,
      updateUsername,
      updatePreferences,
    }),
    [
      loading,
      profile,
      refreshProfile,
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
