import type { DataResource, EntityByResource } from "../../../domain/entities";
import { supabase } from "../../../lib/supabase/client";
import {
  fromDynamicTable,
  mapRemote,
  selectFor,
  type DatabaseRow,
} from "./remoteResourceReaderV2";

export type RemoteChangeCursor = string;

export type RemoteChange = {
  sequence: RemoteChangeCursor;
  resource: DataResource;
  clientId: string;
  operation: "upsert" | "delete";
  version: number;
};

export type RemoteChangePage = {
  changes: RemoteChange[];
  nextCursor: RemoteChangeCursor;
  hasMore: boolean;
};

const CHANGE_PAGE_SIZE = 200;
const CHANGE_RESOURCES = new Set<DataResource>([
  "profiles",
  "moments",
  "reflections",
  "goals",
  "habits",
  "habit_checkins",
]);

function changeLogTable() {
  // workspace_change_log is infrastructure rather than a domain resource, so
  // it intentionally stays behind this single untyped Supabase boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from("workspace_change_log");
}

function requiredString(row: DatabaseRow, key: string) {
  const value = row[key];
  if (typeof value !== "string" || !value) throw new Error(`Invalid ${key}`);
  return value;
}

function sequenceString(value: unknown) {
  if (
    (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) ||
    (typeof value === "string" && /^\d+$/.test(value))
  ) {
    return String(value);
  }
  throw new Error("Invalid workspace change sequence");
}

function mapChange(row: DatabaseRow): RemoteChange {
  const resource = requiredString(row, "resource") as DataResource;
  const operation = requiredString(row, "operation");
  if (!CHANGE_RESOURCES.has(resource))
    throw new Error("Invalid change resource");
  if (operation !== "upsert" && operation !== "delete") {
    throw new Error("Invalid change operation");
  }
  if (typeof row.version !== "number" || row.version < 1) {
    throw new Error("Invalid change version");
  }
  return {
    sequence: sequenceString(row.sequence),
    resource,
    clientId: requiredString(row, "client_id"),
    operation,
    version: row.version,
  };
}

export async function loadRemoteChangeWatermark(
  userId: string,
  resource: DataResource,
): Promise<RemoteChangeCursor> {
  const { data, error } = await changeLogTable()
    .select("sequence")
    .eq("user_id", userId)
    .eq("resource", resource)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? sequenceString((data as DatabaseRow).sequence) : "0";
}

export async function loadRemoteChangePage(
  userId: string,
  resource: DataResource,
  after: RemoteChangeCursor,
  pageSize = CHANGE_PAGE_SIZE,
): Promise<RemoteChangePage> {
  if (!/^\d+$/.test(after)) throw new Error("Invalid change cursor");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new Error("Invalid change page size");
  }
  const { data, error } = await changeLogTable()
    .select("sequence,resource,client_id,operation,version")
    .eq("user_id", userId)
    .eq("resource", resource)
    .gt("sequence", after)
    .order("sequence", { ascending: true })
    .limit(pageSize + 1);
  if (error) throw error;
  const rows = (data ?? []) as DatabaseRow[];
  const visible = rows.slice(0, pageSize).map(mapChange);
  return {
    changes: visible,
    nextCursor: visible.at(-1)?.sequence ?? after,
    hasMore: rows.length > pageSize,
  };
}

export async function loadRemoteEntitiesByClientId<R extends DataResource>(
  userId: string,
  resource: R,
  clientIds: string[],
): Promise<EntityByResource[R][]> {
  const uniqueIds = [...new Set(clientIds)];
  if (uniqueIds.length === 0) return [];
  if (resource === "profiles") {
    if (!uniqueIds.includes(userId)) return [];
    const query = fromDynamicTable(resource)
      .select(selectFor(resource))
      .eq("user_id", userId)
      .maybeSingle();
    const { data, error } = await query;
    if (error) throw error;
    return data
      ? [await mapRemote(resource, data as DatabaseRow)]
      : ([] as EntityByResource[R][]);
  }

  const { data, error } = await fromDynamicTable(resource)
    .select(selectFor(resource))
    .eq("user_id", userId)
    .in("client_id", uniqueIds);
  if (error) throw error;
  return Promise.all(
    ((data ?? []) as DatabaseRow[]).map((row) => mapRemote(resource, row)),
  );
}
