import type { DataStoreApi, DataSyncControl } from "@/data";
import { USER_PREFERENCE_STORAGE_KEYS } from "../../lib/profile/preferences";
import { supabase } from "../../lib/supabase/client";

export async function signOutAndClearLocalData({
  userId,
  store,
  worker,
}: {
  userId: string | null;
  store: DataStoreApi;
  worker: DataSyncControl | null;
}) {
  await worker?.requestFlush();
  const pendingCount = userId
    ? (await store.listPendingMutations(userId)).length
    : 0;
  const { error } = await supabase.auth.signOut();
  if (error) return { error, discardedPendingCount: 0 };

  if (userId) await store.clearUser(userId);
  if (typeof window !== "undefined") {
    USER_PREFERENCE_STORAGE_KEYS.forEach((key) =>
      window.localStorage.removeItem(key),
    );
  }

  return { error: null, discardedPendingCount: pendingCount };
}
