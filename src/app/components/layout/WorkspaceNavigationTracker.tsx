"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  markWorkspaceNavigationComplete,
} from "../../../lib/navigation/workspaceNavigationMetrics";
import { LoadingState } from "../ui/LoadingState";
import { useWorkspaceNavigation } from "./WorkspaceNavigationContext";

const NAVIGATION_TIMEOUT_MS = 10_000;

export function WorkspaceNavigationTracker() {
  const pathname = usePathname();
  const { pendingPath, completeNavigation, cancelNavigation } = useWorkspaceNavigation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pendingPath) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        cancelNavigation();
      }, NAVIGATION_TIMEOUT_MS);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [cancelNavigation, pendingPath]);

  useEffect(() => {
    markWorkspaceNavigationComplete(pathname);
    completeNavigation(pathname);
  }, [completeNavigation, pathname]);

  return pendingPath ? (
    <LoadingState
      className="absolute inset-0 z-20 bg-[var(--color-bg-primary)]"
      label="正在加载页面"
    />
  ) : null;
}
