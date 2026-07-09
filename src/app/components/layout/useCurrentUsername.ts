"use client";

import { useProfile } from "../../../lib/profile/ProfileContext";

export function useCurrentUsername() {
  return useProfile().profile?.username || null;
}
