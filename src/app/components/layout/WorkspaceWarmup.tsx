"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useHabits } from "../../../features/habits/hooks/useHabits";
import {
  getWorkspacePrefetchTargets,
  shouldSkipWorkspacePrefetch,
  WORKSPACE_PREFETCH_DELAY_MS,
  type NetworkConnectionHint,
} from "../../../lib/navigation/workspacePrefetch";

type NavigatorWithConnection = Navigator & {
  connection?: NetworkConnectionHint;
};

const warmedRoutes = new Set<string>();

export function WorkspaceWarmup() {
  const pathname = usePathname();
  const router = useRouter();

  useHabits();

  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection;
    if (shouldSkipWorkspacePrefetch(connection)) return;

    let cancelled = false;
    let routeTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;
    warmedRoutes.add(pathname);
    const targets = getWorkspacePrefetchTargets(pathname).filter(
      (path) => !warmedRoutes.has(path),
    );

    const prefetchNext = async (index: number) => {
      if (cancelled || index >= targets.length) return;
      const target = targets[index];
      warmedRoutes.add(target);

      if (process.env.NODE_ENV === "development") {
        try {
          await fetch(target, { credentials: "same-origin", cache: "no-store" });
        } catch {
          warmedRoutes.delete(target);
        }
      } else {
        router.prefetch(target);
      }

      if (!cancelled) {
        routeTimer = setTimeout(
          () => void prefetchNext(index + 1),
          WORKSPACE_PREFETCH_DELAY_MS,
        );
      }
    };

    if ("requestIdleCallback" in window) {
      idleCallbackId = window.requestIdleCallback(() => void prefetchNext(0), { timeout: 1_500 });
    } else {
      fallbackTimer = setTimeout(() => void prefetchNext(0), 500);
    }

    return () => {
      cancelled = true;
      if (idleCallbackId !== null) window.cancelIdleCallback(idleCallbackId);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (routeTimer) clearTimeout(routeTimer);
    };
  }, [pathname, router]);

  return null;
}
