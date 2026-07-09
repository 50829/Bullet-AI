"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  flushOutbox,
  getDeadOutboxCount,
  installSyncTriggers,
  retryDeadOutboxItems,
  subscribeSyncStatus,
} from "../../lib/localDb/syncEngine";
import type { SyncStatus } from "../../lib/localDb/types";
import type { WorkspaceSessionState } from "./types";

export function useWorkspaceSession(): WorkspaceSessionState {
  const [userId, setUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [deadOutboxCount, setDeadOutboxCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let activeUserId: string | null = null;

    const refreshDeadOutboxCount = async (nextUserId: string | null) => {
      if (!nextUserId) {
        if (isMounted) setDeadOutboxCount(0);
        return;
      }

      const count = await getDeadOutboxCount(nextUserId);
      if (isMounted && activeUserId === nextUserId) {
        setDeadOutboxCount(count);
        if (count > 0) setSyncStatus("failed");
      }
    };

    const setActiveUser = (nextUserId: string | null) => {
      activeUserId = nextUserId;
      if (isMounted) setUserId(nextUserId);
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
      setActiveUser(session?.user?.id ?? null);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setActiveUser(session?.user?.id ?? null);
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
      setDeadOutboxCount(await getDeadOutboxCount(userId));
    }
  }, [userId]);

  return useMemo(
    () => ({
      userId,
      syncStatus,
      deadOutboxCount,
      retrySync,
    }),
    [deadOutboxCount, retrySync, syncStatus, userId],
  );
}
