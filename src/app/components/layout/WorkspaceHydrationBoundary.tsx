"use client";

import { useEffect, useState, type ReactNode } from "react";

import { LoadingState } from "../ui/LoadingState";

export function WorkspaceHydrationBoundary({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return <LoadingState delayed className="min-h-[50dvh]" label="正在加载页面" />;
  return children;
}
