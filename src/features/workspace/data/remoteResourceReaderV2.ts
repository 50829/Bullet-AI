import type {
  DataResource,
  EntityByResource,
  GoalEntity,
  HabitCheckinEntity,
  HabitEntity,
  MomentEntity,
  ReflectionEntity,
} from "../../../domain/entities";
import { logger } from "../../../lib/observability/logger";
import {
  loadRemoteProfiles,
  PROFILE_SELECT,
  profileEntityFromRow,
} from "../../../lib/profile/profileService";
import { supabase } from "../../../lib/supabase/client";

const PAGE_SIZE = 100;
const SNAPSHOT_DAYS = 90;

const SELECTS = {
  profiles: PROFILE_SELECT,
  moments:
    "id,client_id,user_id,content,occurred_on,image_path,version,created_at,updated_at",
  reflections: "id,client_id,user_id,title,body,version,created_at,updated_at",
  goals:
    "id,client_id,user_id,title,description,due_date,completed_at,color,sort_order,version,created_at,updated_at",
  habits:
    "id,client_id,user_id,name,description,frequency,color,started_on,version,created_at,updated_at",
  habit_checkins:
    "id,client_id,user_id,habit_client_id,checked_on,version,created_at,updated_at",
} as const;

export type DatabaseRow = Record<string, unknown>;

export function fromDynamicTable(table: string) {
  // Supabase cannot represent a runtime-selected table as one finite generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table);
}

function cutoffDateKey() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SNAPSHOT_DAYS);
  const year = cutoff.getFullYear();
  const month = String(cutoff.getMonth() + 1).padStart(2, "0");
  const day = String(cutoff.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function requiredString(row: DatabaseRow, key: string) {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Invalid ${key}`);
  return value;
}

function nullableString(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function versionFields(row: DatabaseRow) {
  return {
    clientId: requiredString(row, "client_id"),
    userId: requiredString(row, "user_id"),
    version: typeof row.version === "number" ? row.version : 1,
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

export async function createSignedMomentImageUrl(imagePath: string | null) {
  if (!imagePath) return null;
  const { data, error } = await supabase.storage
    .from("moments")
    .createSignedUrl(imagePath, 60 * 60);
  if (error) {
    logger.warn("moment_image_sign_failed", { imagePath, error });
    throw error;
  }
  if (!data.signedUrl) throw new Error("Moment image URL was not returned");
  return data.signedUrl;
}

function mapMoment(row: DatabaseRow): MomentEntity {
  const imagePath = nullableString(row, "image_path");
  return {
    ...versionFields(row),
    content: requiredString(row, "content"),
    occurredOn: requiredString(row, "occurred_on"),
    imagePath,
  };
}

function mapReflection(row: DatabaseRow): ReflectionEntity {
  return {
    ...versionFields(row),
    title: requiredString(row, "title"),
    body: requiredString(row, "body"),
  };
}

function mapGoal(row: DatabaseRow): GoalEntity {
  return {
    ...versionFields(row),
    title: requiredString(row, "title"),
    description: requiredString(row, "description"),
    dueDate: nullableString(row, "due_date"),
    completedAt: nullableString(row, "completed_at"),
    color: nullableString(row, "color"),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

function mapHabit(row: DatabaseRow): HabitEntity {
  return {
    ...versionFields(row),
    name: requiredString(row, "name"),
    description: nullableString(row, "description"),
    frequency: row.frequency === "weekly" ? "weekly" : "daily",
    color: nullableString(row, "color"),
    startedOn: requiredString(row, "started_on"),
  };
}

function mapCheckin(row: DatabaseRow): HabitCheckinEntity {
  return {
    ...versionFields(row),
    habitClientId: requiredString(row, "habit_client_id"),
    checkedOn: requiredString(row, "checked_on"),
  };
}

function escapeFilterValue(value: string) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

async function readMoments(
  userId: string,
  options: { fullHistory?: boolean } = {},
) {
  const rows: DatabaseRow[] = [];
  let cursor: DatabaseRow | null = null;
  do {
    let query = supabase
      .from("moments")
      .select(SELECTS.moments)
      .eq("user_id", userId);
    if (!options.fullHistory) {
      query = query.gte("occurred_on", cutoffDateKey());
    }
    if (cursor) {
      const occurredOn = requiredString(cursor, "occurred_on");
      const createdAt = requiredString(cursor, "created_at");
      const clientId = requiredString(cursor, "client_id");
      query = query.or(
        `occurred_on.lt.${occurredOn},and(occurred_on.eq.${occurredOn},created_at.lt.${escapeFilterValue(createdAt)}),and(occurred_on.eq.${occurredOn},created_at.eq.${escapeFilterValue(createdAt)},client_id.lt.${escapeFilterValue(clientId)})`,
      );
    }
    const { data, error } = await query
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("client_id", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) throw error;
    const page = (data ?? []) as unknown as DatabaseRow[];
    rows.push(...page);
    cursor = page.length === PAGE_SIZE ? page.at(-1)! : null;
  } while (cursor);
  return rows.map(mapMoment);
}

async function readReflections(userId: string, fullHistory = false) {
  const rows: DatabaseRow[] = [];
  let cursor: DatabaseRow | null = null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SNAPSHOT_DAYS);
  do {
    let query = supabase
      .from("reflections")
      .select(SELECTS.reflections)
      .eq("user_id", userId);
    if (!fullHistory) query = query.gte("updated_at", cutoff.toISOString());
    if (cursor) {
      const updatedAt = requiredString(cursor, "updated_at");
      const clientId = requiredString(cursor, "client_id");
      query = query.or(
        `updated_at.lt.${escapeFilterValue(updatedAt)},and(updated_at.eq.${escapeFilterValue(updatedAt)},client_id.lt.${escapeFilterValue(clientId)})`,
      );
    }
    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .order("client_id", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) throw error;
    const page = (data ?? []) as unknown as DatabaseRow[];
    rows.push(...page);
    cursor = page.length === PAGE_SIZE ? page.at(-1)! : null;
  } while (cursor);
  return rows.map(mapReflection);
}

async function readByClientId(
  userId: string,
  resource: "goals" | "habits" | "habit_checkins",
) {
  const rows: DatabaseRow[] = [];
  let cursor: string | null = null;
  do {
    let query = supabase
      .from(resource)
      .select(SELECTS[resource])
      .eq("user_id", userId);
    // Goals and check-ins are small, semantic history: retention preferences
    // and streaks both require the complete set.
    if (cursor) query = query.gt("client_id", cursor);
    const { data, error } = await query
      .order("client_id", { ascending: true })
      .limit(PAGE_SIZE);
    if (error) throw error;
    const page = (data ?? []) as unknown as DatabaseRow[];
    rows.push(...page);
    cursor =
      page.length === PAGE_SIZE
        ? requiredString(page.at(-1)!, "client_id")
        : null;
  } while (cursor);
  return rows;
}

export async function loadRemoteResource<R extends DataResource>(
  userId: string,
  resource: R,
  options: { fullHistory?: boolean } = {},
): Promise<EntityByResource[R][]> {
  if (resource === "profiles") {
    return (await loadRemoteProfiles(userId)) as EntityByResource[R][];
  }
  if (resource === "moments") {
    return (await readMoments(userId, options)) as EntityByResource[R][];
  }
  if (resource === "reflections") {
    return (await readReflections(
      userId,
      options.fullHistory,
    )) as EntityByResource[R][];
  }
  const rows = await readByClientId(userId, resource);
  if (resource === "goals") return rows.map(mapGoal) as EntityByResource[R][];
  if (resource === "habits") return rows.map(mapHabit) as EntityByResource[R][];
  return rows.map(mapCheckin) as EntityByResource[R][];
}

export function selectFor(resource: DataResource) {
  return SELECTS[resource];
}

export async function mapRemote<R extends DataResource>(
  resource: R,
  row: DatabaseRow,
) {
  if (resource === "profiles") {
    return profileEntityFromRow(row) as EntityByResource[R];
  }
  if (resource === "moments") {
    return mapMoment(row) as EntityByResource[R];
  }
  if (resource === "reflections") {
    return mapReflection(row) as EntityByResource[R];
  }
  if (resource === "goals") return mapGoal(row) as EntityByResource[R];
  if (resource === "habits") return mapHabit(row) as EntityByResource[R];
  return mapCheckin(row) as EntityByResource[R];
}
