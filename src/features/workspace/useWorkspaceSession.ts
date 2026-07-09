"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clearLocalAppData } from "../../lib/localDb/clearLocalAppData";
import { supabase } from "../../lib/supabaseClient";
import {
  cleanupDeadOutboxOrphanedStorage,
  discardDeadOutboxItem,
  flushOutbox,
  installSyncTriggers,
  listDeadOutboxDiagnostics,
  retryDeadOutboxItem,
  retryDeadOutboxItems,
  subscribeSyncStatus,
} from "../../lib/localDb/syncEngine";
import type { DeadOutboxDiagnostic, SyncStatus } from "../../lib/localDb/types";
import type { WorkspaceSessionState } from "./types";

export function useWorkspaceSession(): WorkspaceSessionState {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [deadOutboxCount, setDeadOutboxCount] = useState(0);
  const [deadOutboxItems, setDeadOutboxItems] = useState<
    DeadOutboxDiagnostic[]
  >([]);

  useEffect(() => {
    let isMounted = true;
    let activeUserId: string | null = null;
    let initialSessionLoaded = false;

    const refreshDeadOutboxCount = async (nextUserId: string | null) => {
      if (!nextUserId) {
        if (isMounted) setDeadOutboxCount(0);
        if (isMounted) setDeadOutboxItems([]);
        return;
      }

      const items = await listDeadOutboxDiagnostics(nextUserId);
      if (isMounted && activeUserId === nextUserId) {
        setDeadOutboxItems(items);
        setDeadOutboxCount(items.length);
        if (items.length > 0) setSyncStatus("failed");
      }
    };

    const setActiveUser = async (nextUserId: string | null) => {
      const previousUserId = activeUserId;
      if (
        initialSessionLoaded &&
        previousUserId &&
        previousUserId !== nextUserId
      ) {
        try {
          await clearLocalAppData();
        } catch (error) {
          console.warn("Failed to clear local app data:", error);
        }
      }

      initialSessionLoaded = true;
      activeUserId = nextUserId;
      if (isMounted) setUserId(nextUserId);
      if (isMounted) setReady(true);
      void refreshDeadOutboxCount(nextUserId);
    };

    const unsubscribeSync = subscribeSyncStatus((status) => {
      setSyncStatus(status);
      if (status === "failed") void refreshDeadOutboxCount(activeUserId);
    });
    const uninstallSyncTriggers = installSyncTriggers();

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await setActiveUser(session?.user?.id ?? null);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void setActiveUser(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      unsubscribeSync();
      uninstallSyncTriggers();
    };
  }, []);

  const retrySync = useCallback(async () => {
    if (userId) {
      await retryDeadOutboxItems(userId);
    }
    await flushOutbox();
    if (userId) {
      const items = await listDeadOutboxDiagnostics(userId);
      setDeadOutboxItems(items);
      setDeadOutboxCount(items.length);
    }
  }, [userId]);

  const retryOneDeadOutboxItem = useCallback(
    async (id: string) => {
      if (!userId) return;
      await retryDeadOutboxItem(userId, id);
      await flushOutbox();
      const items = await listDeadOutboxDiagnostics(userId);
      setDeadOutboxItems(items);
      setDeadOutboxCount(items.length);
    },
    [userId],
  );

  const discardOneDeadOutboxItem = useCallback(
    async (id: string) => {
      if (!userId) return;
      await discardDeadOutboxItem(userId, id);
      const items = await listDeadOutboxDiagnostics(userId);
      setDeadOutboxItems(items);
      setDeadOutboxCount(items.length);
    },
    [userId],
  );

  const cleanupOneDeadOutboxOrphanedStorage = useCallback(
    async (id: string) => {
      if (!userId) return;
      await cleanupDeadOutboxOrphanedStorage(userId, id);
      const items = await listDeadOutboxDiagnostics(userId);
      setDeadOutboxItems(items);
      setDeadOutboxCount(items.length);
    },
    [userId],
  );

  return useMemo(
    () => ({
      userId,
      ready,
      syncStatus,
      deadOutboxCount,
      deadOutboxItems,
      retrySync,
      retryDeadOutboxItem: retryOneDeadOutboxItem,
      discardDeadOutboxItem: discardOneDeadOutboxItem,
      cleanupDeadOutboxOrphanedStorage:
        cleanupOneDeadOutboxOrphanedStorage,
    }),
    [
      cleanupOneDeadOutboxOrphanedStorage,
      deadOutboxCount,
      deadOutboxItems,
      discardOneDeadOutboxItem,
      ready,
      retryOneDeadOutboxItem,
      retrySync,
      syncStatus,
      userId,
    ],
  );
}
