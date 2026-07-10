const LEGACY_LOCAL_DB_NAME = "bullet-ai-local-first";

export type LegacyDatabaseCleanupResult = "deleted" | "blocked" | "unavailable";

export function deleteLegacyLocalDatabase(): Promise<LegacyDatabaseCleanupResult> {
  if (typeof indexedDB === "undefined") return Promise.resolve("unavailable");

  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.deleteDatabase(LEGACY_LOCAL_DB_NAME);
    request.onsuccess = () => {
      if (!settled) resolve("deleted");
      settled = true;
    };
    request.onblocked = () => {
      if (!settled) resolve("blocked");
      settled = true;
    };
    request.onerror = () => {
      if (!settled) {
        reject(request.error ?? new Error("Failed to delete legacy database"));
      }
      settled = true;
    };
  });
}
