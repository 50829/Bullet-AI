"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWorkspaceSession } from "./useWorkspaceSession";
import type { WorkspaceSessionState } from "./types";

const WorkspaceSessionContext = createContext<
  WorkspaceSessionState | undefined
>(undefined);

function useRequiredContext<T>(value: T | undefined, hookName: string) {
  if (!value) {
    throw new Error(`${hookName} must be used within WorkspaceProvider`);
  }
  return value;
}

type WorkspaceProviderProps = {
  children: ReactNode;
  initialUserId?: string | null;
};

export const WorkspaceProvider = ({
  children,
  initialUserId = null,
}: WorkspaceProviderProps) => {
  const session = useWorkspaceSession({ initialUserId });

  return (
    <WorkspaceSessionContext.Provider value={session}>
      {children}
    </WorkspaceSessionContext.Provider>
  );
};

export function useWorkspaceSessionContext() {
  return useRequiredContext(
    useContext(WorkspaceSessionContext),
    "useWorkspaceSessionContext",
  );
}
