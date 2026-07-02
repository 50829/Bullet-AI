"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type WorkspaceNavigationContextValue = {
  activePath: string;
  pendingPath: string | null;
  beginNavigation: (path: string) => void;
  completeNavigation: (path: string) => void;
  cancelNavigation: () => void;
};

const WorkspaceNavigationContext = createContext<WorkspaceNavigationContextValue | null>(null);

export function WorkspaceNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const beginNavigation = useCallback((path: string) => {
    setPendingPath(path);
  }, []);

  const completeNavigation = useCallback((path: string) => {
    setPendingPath((current) => (current === path ? null : current));
  }, []);

  const cancelNavigation = useCallback(() => {
    setPendingPath(null);
  }, []);

  const value = useMemo(
    () => ({
      activePath: pendingPath ?? pathname,
      pendingPath,
      beginNavigation,
      completeNavigation,
      cancelNavigation,
    }),
    [beginNavigation, cancelNavigation, completeNavigation, pathname, pendingPath],
  );

  return (
    <WorkspaceNavigationContext.Provider value={value}>
      {children}
    </WorkspaceNavigationContext.Provider>
  );
}

export function useWorkspaceNavigation() {
  const context = useContext(WorkspaceNavigationContext);
  if (!context) {
    throw new Error("useWorkspaceNavigation must be used within WorkspaceNavigationProvider");
  }
  return context;
}
