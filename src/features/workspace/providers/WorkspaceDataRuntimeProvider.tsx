"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DataSyncWorker,
  DataBroadcast,
  DataProvider,
  DataStore,
  createDataQueryClient,
} from "@/data";
import { useAuthSession } from "@/lib/auth/AuthSessionContext";
import { SupabaseRemoteMutationExecutor } from "@/data/supabase";
import { clearWorkspaceUserQueryCache } from "@/data/react/history-pagination";

export function WorkspaceDataRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session = useAuthSession();
  const [notifier] = useState(() => new DataBroadcast());
  const [store] = useState(() => new DataStore({ notifier }));
  const [queryClient] = useState(() => createDataQueryClient());
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
    <DataProvider
      store={store}
      notifier={notifier}
      queryClient={queryClient}
      worker={worker}
    >
      {children}
    </DataProvider>
  );
}
