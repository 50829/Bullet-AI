"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type WorkspaceNavigationContextValue = {
  activePath: string;
  pendingPath: string | null;
  beginNavigation: (path: string) => void;
  completeNavigation: (path: string, options?: { force?: boolean }) => void;
  cancelNavigation: () => void;
  setRouteLoading: (loading: boolean) => void;
};

const WorkspaceNavigationContext =
  createContext<WorkspaceNavigationContextValue | null>(null);

export function WorkspaceNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const routeLoadingRef = useRef(false);

  const beginNavigation = useCallback((path: string) => {
    setPendingPath(path);
    routeLoadingRef.current = false;
  }, []);

  const completeNavigation = useCallback(
    (path: string, options?: { force?: boolean }) => {
      setPendingPath((current) => {
        if (current !== path) return current;
        if (!options?.force && routeLoadingRef.current) return current;
        return null;
      });
    },
    [],
  );

  const setRouteLoading = useCallback((loading: boolean) => {
    routeLoadingRef.current = loading;
  }, []);

  const cancelNavigation = useCallback(() => {
    setPendingPath(null);
    routeLoadingRef.current = false;
  }, []);

  const value = useMemo(
    () => ({
      activePath: pendingPath ?? pathname,
      pendingPath,
      beginNavigation,
      completeNavigation,
      cancelNavigation,
      setRouteLoading,
    }),
    [
      beginNavigation,
      cancelNavigation,
      completeNavigation,
      pathname,
      pendingPath,
      setRouteLoading,
    ],
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
    throw new Error(
      "useWorkspaceNavigation must be used within WorkspaceNavigationProvider",
    );
  }
  return context;
}

export function useWorkspacePageLoading(loading: boolean) {
  const pathname = usePathname();
  const { pendingPath, completeNavigation, setRouteLoading } =
    useWorkspaceNavigation();
  const isPendingCurrentRoute = pendingPath === pathname;

  useLayoutEffect(() => {
    setRouteLoading(loading);
    if (!loading && isPendingCurrentRoute) {
      completeNavigation(pathname);
    }
  }, [
    completeNavigation,
    isPendingCurrentRoute,
    loading,
    pathname,
    setRouteLoading,
  ]);

  return isPendingCurrentRoute && loading;
}
