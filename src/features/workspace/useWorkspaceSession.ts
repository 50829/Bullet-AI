"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  flushOutbox,
  installSyncTriggers,
  subscribeSyncStatus,
} from "../../lib/localDb/syncEngine";
import type { SyncStatus } from "../../lib/localDb/types";
import type { WorkspaceSessionState } from "./types";

export function useWorkspaceSession(): WorkspaceSessionState {
  const [userId, setUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  useEffect(() => {
    let isMounted = true;
    const unsubscribeSync = subscribeSyncStatus(setSyncStatus);
    const uninstallSyncTriggers = installSyncTriggers();

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (isMounted) setUserId(session?.user?.id ?? null);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUserId(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      unsubscribeSync();
      uninstallSyncTriggers();
    };
  }, []);

  const retrySync = useCallback(async () => {
    await flushOutbox();
  }, []);

  return useMemo(
    () => ({
      userId,
      syncStatus,
      retrySync,
    }),
    [retrySync, syncStatus, userId],
  );
}
