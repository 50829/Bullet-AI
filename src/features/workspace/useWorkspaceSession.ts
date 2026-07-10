"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDataRuntime } from "@/data";
import type { ConflictResolution, DataResource } from "@/data";
import { useAuthSession } from "../../lib/auth/AuthSessionContext";
import type { SyncIssue, SyncStatus, WorkspaceSessionState } from "./types";
import { resolveWorkspaceConflict } from "./resolveWorkspaceConflict";

export function useWorkspaceSession(): WorkspaceSessionState {
  const { userId, ready } = useAuthSession();
  const { store, worker, notifier } = useDataRuntime();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncIssues, setSyncIssues] = useState<SyncIssue[]>([]);
  const activeUserId = useRef(userId);
  const diagnosticsGeneration = useRef(0);
  activeUserId.current = userId;

  const refreshDiagnostics = useCallback(async () => {
    const targetUserId = userId;
    const generation = ++diagnosticsGeneration.current;
    if (!targetUserId) {
      setPendingCount(0);
      setSyncIssues([]);
      setSyncStatus("idle");
      return;
    }
    const [diagnostics, conflictDetails] = await Promise.all([
      store.getDiagnostics(targetUserId),
      store.listConflictDetails(targetUserId),
    ]);
    if (
      generation !== diagnosticsGeneration.current ||
      activeUserId.current !== targetUserId
    ) {
      return;
    }
    const conflictsByMutation = new Map(
      conflictDetails.map((conflict) => [conflict.mutationId, conflict]),
    );
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
        conflict: conflictsByMutation.get(mutation.mutationId) ?? null,
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

  const retrySyncItem = useCallback(
    async (id: string) => {
      const requeued = await store.retryBlockedMutation(id);
      if (requeued) await worker?.requestFlush();
      await refreshDiagnostics();
    },
    [refreshDiagnostics, store, worker],
  );

  const getSyncConflictDetails = useCallback(
    (id: string) => store.getConflictDetails(id),
    [store],
  );

  const resolveSyncConflict = useCallback(
    async <R extends DataResource>(
      id: string,
      resolution: ConflictResolution<R>,
    ) => {
      await resolveWorkspaceConflict(store, worker, id, resolution);
      await refreshDiagnostics();
    },
    [refreshDiagnostics, store, worker],
  );

  return useMemo(
    () => ({
      userId,
      ready,
      syncStatus,
      pendingCount,
      syncIssues,
      retrySync,
      retrySyncItem,
      discardSyncItem,
      getSyncConflictDetails,
      resolveSyncConflict,
    }),
    [
      discardSyncItem,
      getSyncConflictDetails,
      pendingCount,
      ready,
      retrySync,
      retrySyncItem,
      resolveSyncConflict,
      syncIssues,
      syncStatus,
      userId,
    ],
  );
}
