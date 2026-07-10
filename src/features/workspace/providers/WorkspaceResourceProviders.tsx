"use client";

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { useGoals } from "../../goals/hooks/useGoals";
import { useHabits } from "../../habits/hooks/useHabits";
import { useMoments } from "../../moments/hooks/useMoments";
import { useReflections } from "../../reflections/hooks/useReflections";
import { useWorkspaceSessionContext } from "../WorkspaceContext";

export type WorkspaceGoalsController = ReturnType<typeof useGoals>;
export type WorkspaceHabitsController = ReturnType<typeof useHabits>;
export type WorkspaceMomentsController = ReturnType<typeof useMoments>;
export type WorkspaceReflectionsController = ReturnType<typeof useReflections>;

const WorkspaceGoalsContext = createContext<WorkspaceGoalsController | null>(
  null,
);
const WorkspaceHabitsContext = createContext<WorkspaceHabitsController | null>(
  null,
);
const WorkspaceMomentsContext =
  createContext<WorkspaceMomentsController | null>(null);
const WorkspaceReflectionsContext =
  createContext<WorkspaceReflectionsController | null>(null);

function useRequiredController<T>(value: T | null, hookName: string) {
  if (!value) throw new Error(`${hookName} must be used within its provider`);
  return value;
}

export function WorkspaceGoalsProvider({ children }: { children?: ReactNode }) {
  const { userId } = useWorkspaceSessionContext();
  const controller = useGoals({ userId });
  return createElement(
    WorkspaceGoalsContext.Provider,
    { value: controller },
    children,
  );
}

export function WorkspaceHabitsProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const { userId } = useWorkspaceSessionContext();
  const controller = useHabits({ userId });
  return createElement(
    WorkspaceHabitsContext.Provider,
    { value: controller },
    children,
  );
}

export function WorkspaceMomentsProvider({
  children,
  fullHistory = false,
}: {
  children?: ReactNode;
  fullHistory?: boolean;
}) {
  const { userId } = useWorkspaceSessionContext();
  const controller = useMoments({ userId, fullHistory });
  return createElement(
    WorkspaceMomentsContext.Provider,
    { value: controller },
    children,
  );
}

export function WorkspaceReflectionsProvider({
  children,
  fullHistory = false,
}: {
  children?: ReactNode;
  fullHistory?: boolean;
}) {
  const { userId } = useWorkspaceSessionContext();
  const controller = useReflections({ userId, fullHistory });
  return createElement(
    WorkspaceReflectionsContext.Provider,
    { value: controller },
    children,
  );
}

export function useWorkspaceGoals() {
  return useRequiredController(
    useContext(WorkspaceGoalsContext),
    "useWorkspaceGoals",
  );
}

export function useWorkspaceHabits() {
  return useRequiredController(
    useContext(WorkspaceHabitsContext),
    "useWorkspaceHabits",
  );
}

export function useWorkspaceMoments() {
  return useRequiredController(
    useContext(WorkspaceMomentsContext),
    "useWorkspaceMoments",
  );
}

export function useWorkspaceReflections() {
  return useRequiredController(
    useContext(WorkspaceReflectionsContext),
    "useWorkspaceReflections",
  );
}
