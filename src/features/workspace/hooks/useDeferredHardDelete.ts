"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PendingDelete<T> = {
  target: T;
  commit: () => Promise<void>;
  timer: number;
};

export function useDeferredHardDelete<T>({
  delayMs = 5_000,
  onError,
}: {
  delayMs?: number;
  onError: (error: unknown) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const pendingRef = useRef<PendingDelete<T> | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const commit = useCallback((pending: PendingDelete<T>) => {
    void pending.commit().catch((error) => onErrorRef.current(error));
  }, []);

  const scheduleDelete = useCallback(
    (target: T, operation: () => Promise<void>) => {
      const previous = pendingRef.current;
      if (previous) {
        window.clearTimeout(previous.timer);
        commit(previous);
      }

      const pending = {
        target,
        commit: operation,
        timer: 0,
      } satisfies PendingDelete<T>;
      pending.timer = window.setTimeout(() => {
        if (pendingRef.current === pending) {
          pendingRef.current = null;
          setPendingDelete(null);
        }
        commit(pending);
      }, delayMs);
      pendingRef.current = pending;
      setPendingDelete(target);
    },
    [commit, delayMs],
  );

  const undoDelete = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingRef.current = null;
    setPendingDelete(null);
  }, []);

  useEffect(
    () => () => {
      const pending = pendingRef.current;
      if (!pending) return;
      window.clearTimeout(pending.timer);
      pendingRef.current = null;
      commit(pending);
    },
    [commit],
  );

  return { pendingDelete, scheduleDelete, undoDelete };
}
