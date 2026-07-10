import type { DataV2StoreApi, DataV2SyncControl } from "../data-v2";
import { USER_PREFERENCE_STORAGE_KEYS } from "../profile/preferences";
import { supabase } from "../supabase/client";

export async function signOutAndClearLocalData({
  userId,
  store,
  worker,
}: {
  userId: string | null;
  store: DataV2StoreApi;
  worker: DataV2SyncControl | null;
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
