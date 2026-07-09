import { USER_PREFERENCE_STORAGE_KEYS } from "../profile/preferences";
import { clearSignedImageUrlCache } from "./remoteReader";
import { deleteLocalDb } from "./indexedDb";

export async function clearLocalAppData() {
  await deleteLocalDb();
  clearSignedImageUrlCache();

  if (typeof window === "undefined") return;

  for (const key of USER_PREFERENCE_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}
