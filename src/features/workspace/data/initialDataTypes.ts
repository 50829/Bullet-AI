import type { HabitCheckin, HabitRecord } from "../../habits/types";
import type { GoalRecord } from "../../goals/types";
import type { MomentRecord } from "../../moments/types";
import type { ReflectionRecord } from "../../reflections/types";

export type WorkspaceRouteKind = "home" | "goals" | "moments" | "reflections";

export type WorkspaceEnabledCollection =
  "goals" | "habits" | "moments" | "reflections";

export type InitialCollectionSnapshot<T> = {
  userId: string;
  items: T[];
  complete: boolean;
  hasMore?: boolean;
  nextOffset?: number;
};

export type WorkspaceInitialData = {
  userId: string | null;
  goals?: InitialCollectionSnapshot<GoalRecord>;
  habits?: InitialCollectionSnapshot<HabitRecord>;
  habitCheckins?: InitialCollectionSnapshot<HabitCheckin>;
  moments?: InitialCollectionSnapshot<MomentRecord>;
  reflections?: InitialCollectionSnapshot<ReflectionRecord>;
};

export const WORKSPACE_ROUTE_COLLECTIONS: Record<
  WorkspaceRouteKind,
  WorkspaceEnabledCollection[]
> = {
  home: ["goals", "habits", "moments", "reflections"],
  goals: ["goals", "habits"],
  moments: ["moments"],
  reflections: ["reflections"],
};
