import type {
  DataResource,
  EntityByResource,
  GoalEntity,
  HabitCheckinEntity,
  HabitEntity,
  MomentEntity,
  ReflectionEntity,
} from "../../domain/entities";
import { logger } from "../../lib/observability/logger";
import {
  loadRemoteProfiles,
  PROFILE_SELECT,
  profileEntityFromRow,
} from "./profile-adapter";
import { supabase } from "../../lib/supabase/client";

const PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;
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

export type PaginatedResource = "moments" | "reflections";

export type MomentPageCursor = Readonly<{
  occurredOn: string;
  createdAt: string;
  clientId: string;
}>;

export type ReflectionPageCursor = Readonly<{
  updatedAt: string;
  clientId: string;
}>;

export type RemoteResourceCursor<R extends PaginatedResource> =
  R extends "moments" ? MomentPageCursor : ReflectionPageCursor;

export type RemoteResourcePage<R extends PaginatedResource> = Readonly<{
  items: EntityByResource[R][];
  nextCursor: RemoteResourceCursor<R> | null;
}>;

export type LoadRemoteResourcePageOptions<R extends PaginatedResource> = {
  cursor?: RemoteResourceCursor<R> | null;
  pageSize?: number;
  recentOnly?: boolean;
};

export function fromDynamicTable(table: DataResource) {
  // Supabase cannot preserve a runtime table/payload correlation without a
  // generated Database type. Keep the untyped boundary here; the finite table
  // name plus the adapters on either side are strongly checked.
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

function normalizedPageSize(pageSize = PAGE_SIZE) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("pageSize must be a positive integer");
  }
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

async function readMomentsPage(
  userId: string,
  options: LoadRemoteResourcePageOptions<"moments"> = {},
): Promise<RemoteResourcePage<"moments">> {
  const pageSize = normalizedPageSize(options.pageSize);
  let query = supabase
    .from("moments")
    .select(SELECTS.moments)
    .eq("user_id", userId);
  if (options.recentOnly) {
    query = query.gte("occurred_on", cutoffDateKey());
  }
  const cursor = options.cursor;
  if (cursor) {
    query = query.or(
      `occurred_on.lt.${cursor.occurredOn},and(occurred_on.eq.${cursor.occurredOn},created_at.lt.${escapeFilterValue(cursor.createdAt)}),and(occurred_on.eq.${cursor.occurredOn},created_at.eq.${escapeFilterValue(cursor.createdAt)},client_id.lt.${escapeFilterValue(cursor.clientId)})`,
    );
  }
  const { data, error } = await query
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("client_id", { ascending: false })
    .limit(pageSize + 1);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as DatabaseRow[]).slice(0, pageSize);
  const last = rows.at(-1);
  return {
    items: rows.map(mapMoment),
    nextCursor:
      data && data.length > pageSize && last
        ? {
            occurredOn: requiredString(last, "occurred_on"),
            createdAt: requiredString(last, "created_at"),
            clientId: requiredString(last, "client_id"),
          }
        : null,
  };
}

async function readReflectionsPage(
  userId: string,
  options: LoadRemoteResourcePageOptions<"reflections"> = {},
): Promise<RemoteResourcePage<"reflections">> {
  const pageSize = normalizedPageSize(options.pageSize);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SNAPSHOT_DAYS);
  let query = supabase
    .from("reflections")
    .select(SELECTS.reflections)
    .eq("user_id", userId);
  if (options.recentOnly) {
    query = query.gte("updated_at", cutoff.toISOString());
  }
  const cursor = options.cursor;
  if (cursor) {
    query = query.or(
      `updated_at.lt.${escapeFilterValue(cursor.updatedAt)},and(updated_at.eq.${escapeFilterValue(cursor.updatedAt)},client_id.lt.${escapeFilterValue(cursor.clientId)})`,
    );
  }
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("client_id", { ascending: false })
    .limit(pageSize + 1);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as DatabaseRow[]).slice(0, pageSize);
  const last = rows.at(-1);
  return {
    items: rows.map(mapReflection),
    nextCursor:
      data && data.length > pageSize && last
        ? {
            updatedAt: requiredString(last, "updated_at"),
            clientId: requiredString(last, "client_id"),
          }
        : null,
  };
}

export async function loadRemoteResourcePage<R extends PaginatedResource>(
  userId: string,
  resource: R,
  options: LoadRemoteResourcePageOptions<R> = {},
): Promise<RemoteResourcePage<R>> {
  if (resource === "moments") {
    return readMomentsPage(
      userId,
      options as LoadRemoteResourcePageOptions<"moments">,
    ) as Promise<RemoteResourcePage<R>>;
  }
  return readReflectionsPage(
    userId,
    options as LoadRemoteResourcePageOptions<"reflections">,
  ) as Promise<RemoteResourcePage<R>>;
}

async function readAllPages<R extends PaginatedResource>(
  userId: string,
  resource: R,
  recentOnly: boolean,
) {
  const items: EntityByResource[R][] = [];
  let cursor: RemoteResourceCursor<R> | null = null;
  do {
    const page: RemoteResourcePage<R> = await loadRemoteResourcePage(
      userId,
      resource,
      {
        cursor,
        recentOnly,
      },
    );
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
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
    return (await readAllPages(
      userId,
      "moments",
      !options.fullHistory,
    )) as EntityByResource[R][];
  }
  if (resource === "reflections") {
    return (await readAllPages(
      userId,
      "reflections",
      !options.fullHistory,
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
