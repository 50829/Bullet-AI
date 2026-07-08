"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useWorkspaceCollections } from "./useWorkspaceCollections";
import { useWorkspaceSession } from "./useWorkspaceSession";
import type {
  GoalRecord,
  MomentRecord,
  ReflectionRecord,
  WorkspaceCollections,
  WorkspaceSessionState,
} from "./types";

type WorkspaceMomentsState = {
  moments: MomentRecord[];
  loading: boolean;
  refreshMoments: WorkspaceCollections["refreshMoments"];
  addMoment: WorkspaceCollections["addMoment"];
  updateMoment: WorkspaceCollections["updateMoment"];
  deleteMoment: WorkspaceCollections["deleteMoment"];
};

type WorkspaceReflectionsState = {
  reflections: ReflectionRecord[];
  loading: boolean;
  refreshReflections: WorkspaceCollections["refreshReflections"];
  addReflection: WorkspaceCollections["addReflection"];
  updateReflection: WorkspaceCollections["updateReflection"];
  deleteReflection: WorkspaceCollections["deleteReflection"];
};

type WorkspaceGoalsState = {
  goals: GoalRecord[];
  loading: boolean;
  refreshGoals: WorkspaceCollections["refreshGoals"];
  addGoal: WorkspaceCollections["addGoal"];
  updateGoal: WorkspaceCollections["updateGoal"];
  reorderGoals: WorkspaceCollections["reorderGoals"];
  deleteGoal: WorkspaceCollections["deleteGoal"];
};

type WorkspaceExportState = {
  exportData: WorkspaceCollections["exportData"];
};

const WorkspaceSessionContext = createContext<
  WorkspaceSessionState | undefined
>(undefined);
const WorkspaceMomentsContext = createContext<
  WorkspaceMomentsState | undefined
>(undefined);
const WorkspaceReflectionsContext = createContext<
  WorkspaceReflectionsState | undefined
>(undefined);
const WorkspaceGoalsContext = createContext<WorkspaceGoalsState | undefined>(
  undefined,
);
const WorkspaceExportContext = createContext<WorkspaceExportState | undefined>(
  undefined,
);

function useRequiredContext<T>(value: T | undefined, hookName: string) {
  if (!value) {
    throw new Error(`${hookName} must be used within WorkspaceProvider`);
  }
  return value;
}

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const session = useWorkspaceSession();
  const collections = useWorkspaceCollections(session.userId);

  const momentsValue = useMemo<WorkspaceMomentsState>(
    () => ({
      moments: collections.moments,
      loading: collections.loading.moments,
      refreshMoments: collections.refreshMoments,
      addMoment: collections.addMoment,
      updateMoment: collections.updateMoment,
      deleteMoment: collections.deleteMoment,
    }),
    [
      collections.addMoment,
      collections.deleteMoment,
      collections.loading.moments,
      collections.moments,
      collections.refreshMoments,
      collections.updateMoment,
    ],
  );

  const reflectionsValue = useMemo<WorkspaceReflectionsState>(
    () => ({
      reflections: collections.reflections,
      loading: collections.loading.reflections,
      refreshReflections: collections.refreshReflections,
      addReflection: collections.addReflection,
      updateReflection: collections.updateReflection,
      deleteReflection: collections.deleteReflection,
    }),
    [
      collections.addReflection,
      collections.deleteReflection,
      collections.loading.reflections,
      collections.reflections,
      collections.refreshReflections,
      collections.updateReflection,
    ],
  );

  const goalsValue = useMemo<WorkspaceGoalsState>(
    () => ({
      goals: collections.goals,
      loading: collections.loading.goals,
      refreshGoals: collections.refreshGoals,
      addGoal: collections.addGoal,
      updateGoal: collections.updateGoal,
      reorderGoals: collections.reorderGoals,
      deleteGoal: collections.deleteGoal,
    }),
    [
      collections.addGoal,
      collections.deleteGoal,
      collections.goals,
      collections.loading.goals,
      collections.refreshGoals,
      collections.reorderGoals,
      collections.updateGoal,
    ],
  );

  const exportValue = useMemo<WorkspaceExportState>(
    () => ({
      exportData: collections.exportData,
    }),
    [collections.exportData],
  );

  return (
    <WorkspaceSessionContext.Provider value={session}>
      <WorkspaceMomentsContext.Provider value={momentsValue}>
        <WorkspaceReflectionsContext.Provider value={reflectionsValue}>
          <WorkspaceGoalsContext.Provider value={goalsValue}>
            <WorkspaceExportContext.Provider value={exportValue}>
              {children}
            </WorkspaceExportContext.Provider>
          </WorkspaceGoalsContext.Provider>
        </WorkspaceReflectionsContext.Provider>
      </WorkspaceMomentsContext.Provider>
    </WorkspaceSessionContext.Provider>
  );
};

export function useWorkspaceSessionContext() {
  return useRequiredContext(
    useContext(WorkspaceSessionContext),
    "useWorkspaceSessionContext",
  );
}

export function useMomentsContext() {
  return useRequiredContext(useContext(WorkspaceMomentsContext), "useMoments");
}

export function useReflectionsContext() {
  return useRequiredContext(
    useContext(WorkspaceReflectionsContext),
    "useReflections",
  );
}

export function useGoalsContext() {
  return useRequiredContext(useContext(WorkspaceGoalsContext), "useGoals");
}

export function useWorkspaceExportContext() {
  return useRequiredContext(
    useContext(WorkspaceExportContext),
    "useWorkspaceExportContext",
  );
}
