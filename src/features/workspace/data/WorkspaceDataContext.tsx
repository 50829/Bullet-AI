"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
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
  const goals = useGoals({ userId: session.userId });
  const habits = useHabits({ userId: session.userId });
  const moments = useMoments({ userId: session.userId });
  const reflections = useReflections({ userId: session.userId });

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
    throw new Error("useWorkspaceData must be used within WorkspaceDataProvider");
  }
  return value;
}
