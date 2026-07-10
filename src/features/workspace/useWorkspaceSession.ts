"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataV2 } from "../../lib/data-v2";
import { useAuthSession } from "../../lib/auth/AuthSessionContext";
import type { SyncIssue, SyncStatus, WorkspaceSessionState } from "./types";

export function useWorkspaceSession(): WorkspaceSessionState {
  const { userId, ready } = useAuthSession();
  const { store, worker, notifier } = useDataV2();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncIssues, setSyncIssues] = useState<SyncIssue[]>([]);

  const refreshDiagnostics = useCallback(async () => {
    if (!userId) {
      setPendingCount(0);
      setSyncIssues([]);
      setSyncStatus("idle");
      return;
    }
    const diagnostics = await store.getDiagnostics(userId);
    const online = typeof navigator === "undefined" || navigator.onLine;
    const issues = diagnostics.mutations
      .filter(
        (mutation) =>
          mutation.status === "blocked" || mutation.status === "conflict",
      )
      .map((mutation) => ({
        id: mutation.mutationId,
        resource: mutation.resource,
        operation: mutation.kind,
        status: mutation.status,
        error: mutation.lastError ?? null,
        attemptCount: mutation.attemptCount,
        updatedAt: mutation.updatedAt,
      }));
    setPendingCount(diagnostics.mutations.length);
    setSyncIssues(issues);
    setSyncStatus(
      !online
        ? "offline"
        : diagnostics.blocked > 0 || diagnostics.conflicts > 0
          ? "failed"
          : diagnostics.sending > 0 || diagnostics.queued > 0
            ? "syncing"
            : "idle",
    );
  }, [store, userId]);

  useEffect(() => {
    void refreshDiagnostics();
    const unsubscribe = notifier.subscribe((event) => {
      if (event.userId === userId) void refreshDiagnostics();
    });
    const handleConnectivity = () => void refreshDiagnostics();
    window.addEventListener("online", handleConnectivity);
    window.addEventListener("offline", handleConnectivity);
    return () => {
      unsubscribe();
      window.removeEventListener("online", handleConnectivity);
      window.removeEventListener("offline", handleConnectivity);
    };
  }, [notifier, refreshDiagnostics, userId]);

  const retrySync = useCallback(async () => {
    await worker?.requestFlush();
    await refreshDiagnostics();
  }, [refreshDiagnostics, worker]);

  const discardSyncItem = useCallback(
    async (id: string) => {
      await store.discardMutation(id);
      await refreshDiagnostics();
    },
    [refreshDiagnostics, store],
  );

  return useMemo(
    () => ({
      userId,
      ready,
      syncStatus,
      pendingCount,
      syncIssues,
      retrySync,
      discardSyncItem,
    }),
    [
      discardSyncItem,
      pendingCount,
      ready,
      retrySync,
      syncIssues,
      syncStatus,
      userId,
    ],
  );
}
