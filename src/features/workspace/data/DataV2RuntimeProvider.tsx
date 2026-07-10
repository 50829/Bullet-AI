"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DataSyncWorker,
  DataV2Broadcast,
  DataV2Provider,
  DataV2Store,
  createDataV2QueryClient,
  deleteLegacyLocalDatabase,
} from "../../../lib/data-v2";
import { useAuthSession } from "../../../lib/auth/AuthSessionContext";
import { SupabaseRemoteMutationExecutor } from "./remoteRepositoryV2";
import { clearWorkspaceUserQueryCache } from "./historyPagination";

export function DataV2RuntimeProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const [notifier] = useState(() => new DataV2Broadcast());
  const [store] = useState(() => new DataV2Store({ notifier }));
  const [queryClient] = useState(() => createDataV2QueryClient());
  const previousUserId = useRef<string | null>(null);
  const activeSessionUserId = useRef<string | null>(null);
  if (activeSessionUserId.current !== session.userId) {
    activeSessionUserId.current = session.userId;
    if (session.userId) store.beginUserSession(session.userId);
  }
  const worker = useMemo(
    () =>
      session.userId
        ? new DataSyncWorker({
            userId: session.userId,
            store,
            notifier,
            executor: new SupabaseRemoteMutationExecutor(),
          })
        : null,
    [notifier, session.userId, store],
  );
  useEffect(() => {
    // v2 intentionally replaces the unreleased local-first database.
    void deleteLegacyLocalDatabase();
  }, []);

  useEffect(() => {
    void session.revision;
    if (session.userId) void worker?.resumeAfterAuth();
  }, [session.revision, session.userId, worker]);

  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = session.userId;
    if (previous && previous !== session.userId) {
      void clearWorkspaceUserQueryCache(queryClient, previous);
      void store.clearUser(previous);
    }
  }, [queryClient, session.userId, store]);

  useEffect(() => {
    if (!session.userId) return;
    void store.pruneExpiredSnapshots(session.userId);
  }, [session.userId, store]);

  return (
    <DataV2Provider
      store={store}
      notifier={notifier}
      queryClient={queryClient}
      worker={worker}
    >
      {children}
    </DataV2Provider>
  );
}
