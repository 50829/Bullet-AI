import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RETENTION_DAYS = 30;
const PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

const SOFT_DELETE_TABLES = [
  "habit_checkins",
  "moments",
  "reflections",
  "goals",
  "habits",
] as const;

const IMAGE_REFERENCE_TABLES = [
  "moments",
  "reflections",
  "goals",
  "habits",
] as const;

const STORAGE_BUCKETS = ["moments", "reflections", "goals", "habits"] as const;

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

function getRetentionDays() {
  const configured = Number(process.env.DATA_RETENTION_DAYS);
  if (Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }
  return DEFAULT_RETENTION_DAYS;
}

function getAcceptedSecrets() {
  return [
    process.env.MAINTENANCE_CLEANUP_SECRET,
    process.env.CRON_SECRET,
  ].filter((value): value is string => Boolean(value));
}

function isAuthorized(request: Request) {
  const secrets = getAcceptedSecrets();
  if (secrets.length === 0) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  return secrets.includes(token);
}

async function cleanupSoftDeletedRows(
  supabase: SupabaseAdminClient,
  cutoffIso: string,
) {
  const result: Record<string, number> = {};

  for (const table of SOFT_DELETE_TABLES) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffIso);

    if (error) throw new Error(`${table}: ${error.message}`);
    result[table] = count ?? 0;
  }

  return result;
}

async function collectReferencedImagePaths(supabase: SupabaseAdminClient) {
  const paths = new Set<string>();

  for (const table of IMAGE_REFERENCE_TABLES) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select("image_path")
        .not("image_path", "is", null)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        if (table === "habits") break;
        throw new Error(`${table}: ${error.message}`);
      }

      for (const row of data ?? []) {
        if (typeof row.image_path === "string" && row.image_path) {
          paths.add(row.image_path);
        }
      }

      if (!data || data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return paths;
}

async function listOldStorageObjects(
  supabase: SupabaseAdminClient,
  bucket: string,
  cutoffIso: string,
) {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("storage.objects")
      .select("name")
      .eq("bucket_id", bucket)
      .lt("created_at", cutoffIso)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`${bucket}: ${error.message}`);

    for (const row of data ?? []) {
      if (typeof row.name === "string" && row.name) paths.push(row.name);
    }

    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return paths;
}

async function removeStoragePaths(
  supabase: SupabaseAdminClient,
  bucket: string,
  paths: string[],
) {
  let removed = 0;
  const errors: string[] = [];

  for (let index = 0; index < paths.length; index += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(index, index + REMOVE_BATCH_SIZE);
    const { error } = await supabase.storage.from(bucket).remove(batch);

    if (error) {
      errors.push(`${bucket}: ${error.message}`);
      continue;
    }

    removed += batch.length;
  }

  return { removed, errors };
}

async function cleanupOrphanedStorage(
  supabase: SupabaseAdminClient,
  cutoffIso: string,
) {
  const referencedPaths = await collectReferencedImagePaths(supabase);
  const result: Record<string, { scanned: number; removed: number }> = {};
  const errors: string[] = [];

  for (const bucket of STORAGE_BUCKETS) {
    const oldPaths = await listOldStorageObjects(supabase, bucket, cutoffIso);
    const orphanedPaths = oldPaths.filter((path) => !referencedPaths.has(path));
    const removed = await removeStoragePaths(supabase, bucket, orphanedPaths);

    result[bucket] = {
      scanned: oldPaths.length,
      removed: removed.removed,
    };
    errors.push(...removed.errors);
  }

  return { buckets: result, errors };
}

async function runCleanup(request: Request) {
  if (getAcceptedSecrets().length === 0) {
    return NextResponse.json(
      { error: "Maintenance cleanup secret is not configured" },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retentionDays = getRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  try {
    const supabase = createAdminClient();
    const deletedRows = await cleanupSoftDeletedRows(supabase, cutoffIso);
    const orphanedStorage = await cleanupOrphanedStorage(supabase, cutoffIso);

    return NextResponse.json({
      ok: true,
      retentionDays,
      cutoff: cutoffIso,
      deletedRows,
      orphanedStorage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Maintenance cleanup failed",
      },
      { status: 500 },
    );
  }
}

export function GET(request: Request) {
  return runCleanup(request);
}

export function POST(request: Request) {
  return runCleanup(request);
}
