"use client";

import { useProfile } from "@/features/profile/ProfileContext";

export function useCurrentUsername() {
  return useProfile().profile?.username || null;
}
