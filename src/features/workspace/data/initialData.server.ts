import { createClient } from "../../../lib/supabase/server";
import {
  readRemoteCollectionPageWithClient,
  readRemoteCollectionWithClient,
} from "../../../lib/localDb/remoteReaderCore";
import type { HabitCheckin, HabitRecord } from "../../habits/types";
import type { GoalRecord } from "../../goals/types";
import type { MomentRecord } from "../../moments/types";
import type { ReflectionRecord } from "../../reflections/types";
import type {
  InitialCollectionSnapshot,
  WorkspaceInitialData,
  WorkspaceRouteKind,
} from "./initialDataTypes";

const WORKSPACE_PAGE_SIZE = 20;

async function getWorkspaceServerClientAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    userId: error ? null : (user?.id ?? null),
  };
}

function completeSnapshot<T>(
  userId: string,
  items: T[],
): InitialCollectionSnapshot<T> {
  return {
    userId,
    items,
    complete: true,
    hasMore: false,
    nextOffset: items.length,
  };
}

function partialSnapshot<T>(
  userId: string,
  items: T[],
  hasMore: boolean,
  nextOffset: number,
): InitialCollectionSnapshot<T> {
  return {
    userId,
    items,
    complete: false,
    hasMore,
    nextOffset,
  };
}

export async function getWorkspaceServerUserId() {
  const { userId } = await getWorkspaceServerClientAndUser();
  return userId;
}

export async function loadWorkspaceInitialData(
  routeKind: WorkspaceRouteKind,
): Promise<WorkspaceInitialData> {
  const { supabase, userId } = await getWorkspaceServerClientAndUser();

  if (!userId) return { userId: null };

  if (routeKind === "home") {
    const [goals, habits, habitCheckins, momentsPage, reflectionsPage] =
      await Promise.all([
        readRemoteCollectionWithClient<GoalRecord>(supabase, userId, "goals"),
        readRemoteCollectionWithClient<HabitRecord>(supabase, userId, "habits"),
        readRemoteCollectionWithClient<HabitCheckin>(
          supabase,
          userId,
          "habit_checkins",
        ),
        readRemoteCollectionPageWithClient<MomentRecord>(
          supabase,
          userId,
          "moments",
          {
            limit: 4,
            offset: 0,
            includeSignedImageUrls: false,
          },
          { column: "created_at", ascending: false },
        ),
        readRemoteCollectionPageWithClient<ReflectionRecord>(
          supabase,
          userId,
          "reflections",
          {
            limit: 3,
            offset: 0,
            includeSignedImageUrls: false,
          },
          { column: "updated_at", ascending: false },
        ),
      ]);

    return {
      userId,
      goals: completeSnapshot(userId, goals),
      habits: completeSnapshot(userId, habits),
      habitCheckins: completeSnapshot(userId, habitCheckins),
      moments: partialSnapshot(
        userId,
        momentsPage.items,
        momentsPage.hasMore,
        momentsPage.nextOffset,
      ),
      reflections: partialSnapshot(
        userId,
        reflectionsPage.items,
        reflectionsPage.hasMore,
        reflectionsPage.nextOffset,
      ),
    };
  }

  if (routeKind === "goals") {
    const [goals, habits, habitCheckins] = await Promise.all([
      readRemoteCollectionWithClient<GoalRecord>(supabase, userId, "goals"),
      readRemoteCollectionWithClient<HabitRecord>(supabase, userId, "habits"),
      readRemoteCollectionWithClient<HabitCheckin>(
        supabase,
        userId,
        "habit_checkins",
      ),
    ]);

    return {
      userId,
      goals: completeSnapshot(userId, goals),
      habits: completeSnapshot(userId, habits),
      habitCheckins: completeSnapshot(userId, habitCheckins),
    };
  }

  if (routeKind === "moments") {
    const page = await readRemoteCollectionPageWithClient<MomentRecord>(
      supabase,
      userId,
      "moments",
      {
        limit: WORKSPACE_PAGE_SIZE,
        offset: 0,
      },
      { column: "created_at", ascending: false },
    );

    return {
      userId,
      moments: partialSnapshot(
        userId,
        page.items,
        page.hasMore,
        page.nextOffset,
      ),
    };
  }

  const page = await readRemoteCollectionPageWithClient<ReflectionRecord>(
    supabase,
    userId,
    "reflections",
    {
      limit: WORKSPACE_PAGE_SIZE,
      offset: 0,
    },
    { column: "created_at", ascending: false },
  );

  return {
    userId,
    reflections: partialSnapshot(
      userId,
      page.items,
      page.hasMore,
      page.nextOffset,
    ),
  };
}
