"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {
  markWorkspaceNavigationComplete,
} from "../../../lib/navigation/workspaceNavigationMetrics";
import { WorkspaceRouteLoading } from "./WorkspaceRouteLoading";
import { useWorkspaceNavigation } from "./WorkspaceNavigationContext";

const NAVIGATION_TIMEOUT_MS = 10_000;
const LOADING_REVEAL_DELAY_MS = 120;

export function WorkspaceNavigationTracker() {
  const pathname = usePathname();
  const { pendingPath, completeNavigation, cancelNavigation } = useWorkspaceNavigation();
  const [pending, setPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pendingPath) {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        revealTimerRef.current = null;
        setPending(true);
      }, LOADING_REVEAL_DELAY_MS);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setPending(false);
        cancelNavigation();
      }, NAVIGATION_TIMEOUT_MS);
    } else {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPending(false);
    }

    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [cancelNavigation, pendingPath]);

  useLayoutEffect(() => {
    markWorkspaceNavigationComplete(pathname);
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPending(false);
    completeNavigation(pathname);
  }, [completeNavigation, pathname]);

  return pending ? <WorkspaceRouteLoading overlay /> : null;
}
