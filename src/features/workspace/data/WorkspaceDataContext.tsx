"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useGoals } from "../../goals/hooks/useGoals";
import { useHabits } from "../../habits/hooks/useHabits";
import { useMoments } from "../../moments/hooks/useMoments";
import { useReflections } from "../../reflections/hooks/useReflections";
import { useWorkspaceSessionContext } from "../WorkspaceContext";
import type { WorkspaceSessionState } from "../types";

export type WorkspaceDataCollections = {
  goals: ReturnType<typeof useGoals>;
  habits: ReturnType<typeof useHabits>;
  moments: ReturnType<typeof useMoments>;
  reflections: ReturnType<typeof useReflections>;
};

export type WorkspaceDataState = WorkspaceDataCollections & {
  session: WorkspaceSessionState;
};

const WorkspaceDataContext = createContext<WorkspaceDataState | undefined>(
  undefined,
);

export function WorkspaceDataProvider({ children }: { children: ReactNode }) {
  const session = useWorkspaceSessionContext();
  const pathname = usePathname();
  const isHome = pathname?.includes("/home") ?? false;
  const isGoals = pathname?.includes("/goals") ?? false;
  const isMoments = pathname?.includes("/moments") ?? false;
  const isReflections = pathname?.includes("/reflections") ?? false;
  const goals = useGoals({
    userId: isHome || isGoals ? session.userId : null,
  });
  const habits = useHabits({
    userId: isHome || isGoals ? session.userId : null,
  });
  const moments = useMoments({
    userId: isHome || isMoments ? session.userId : null,
    fullHistory: isMoments,
  });
  const reflections = useReflections({
    userId: isHome || isReflections ? session.userId : null,
    fullHistory: isReflections,
  });

  const value = useMemo<WorkspaceDataState>(
    () => ({
      session,
      goals,
      habits,
      moments,
      reflections,
    }),
    [goals, habits, moments, reflections, session],
  );

  return createElement(WorkspaceDataContext.Provider, { value }, children);
}

export function useWorkspaceData() {
  const value = useContext(WorkspaceDataContext);
  if (!value) {
    throw new Error(
      "useWorkspaceData must be used within WorkspaceDataProvider",
    );
  }
  return value;
}
