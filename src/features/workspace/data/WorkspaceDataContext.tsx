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
import type {
  WorkspaceEnabledCollection,
  WorkspaceInitialData,
} from "./initialDataTypes";

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

type WorkspaceDataProviderProps = {
  children?: ReactNode;
  enabledCollections?: WorkspaceEnabledCollection[];
  initialData?: WorkspaceInitialData;
};

export function WorkspaceDataProvider({
  children,
  enabledCollections = ["goals", "habits", "moments", "reflections"],
  initialData,
}: WorkspaceDataProviderProps) {
  const session = useWorkspaceSessionContext();
  const enabled = useMemo(
    () => new Set<WorkspaceEnabledCollection>(enabledCollections),
    [enabledCollections],
  );
  const goalsEnabled = enabled.has("goals");
  const habitsEnabled = enabled.has("habits");
  const momentsEnabled = enabled.has("moments");
  const reflectionsEnabled = enabled.has("reflections");
  const momentsRemotePageSize =
    momentsEnabled && enabledCollections.length === 1 ? 20 : 0;
  const reflectionsRemotePageSize =
    reflectionsEnabled && enabledCollections.length === 1 ? 20 : 0;
  const goals = useGoals({
    userId: goalsEnabled ? session.userId : null,
    initialSnapshot: goalsEnabled ? initialData?.goals : undefined,
  });
  const habits = useHabits({
    userId: habitsEnabled ? session.userId : null,
    initialHabitsSnapshot: habitsEnabled ? initialData?.habits : undefined,
    initialCheckinsSnapshot: habitsEnabled
      ? initialData?.habitCheckins
      : undefined,
  });
  const moments = useMoments({
    userId: momentsEnabled ? session.userId : null,
    remotePageSize: momentsRemotePageSize,
    initialSnapshot: momentsEnabled ? initialData?.moments : undefined,
  });
  const reflections = useReflections({
    userId: reflectionsEnabled ? session.userId : null,
    remotePageSize: reflectionsRemotePageSize,
    initialSnapshot: reflectionsEnabled ? initialData?.reflections : undefined,
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
