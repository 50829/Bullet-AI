"use client";

import { useEffect, useState, type ReactNode } from "react";

import { WorkspaceRouteLoading } from "./WorkspaceRouteLoading";

export function WorkspaceHydrationBoundary({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return <WorkspaceRouteLoading delayed />;
  return children;
}
