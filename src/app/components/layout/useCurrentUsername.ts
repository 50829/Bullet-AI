"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { getCurrentUserProfile } from "../../../lib/profile/profileService";

export function useCurrentUsername() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const profile = await getCurrentUserProfile();
        setUsername(profile?.username || null);
      } catch (error) {
        console.error("获取用户名失败:", error);
        setUsername(null);
      }
    };

    fetchUsername();

    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ username?: string | null }>)
        .detail;
      setUsername(detail?.username || null);
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const profile = await getCurrentUserProfile();
        setUsername(profile?.username || null);
      } else {
        setUsername(null);
      }
    });

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      subscription.unsubscribe();
    };
  }, []);

  return username;
}
