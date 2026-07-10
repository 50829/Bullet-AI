import { createClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;
const LEGACY_BUCKETS = ["reflections", "goals", "habits"];
const CONFIRMATION = "DELETE_STORAGE";

function readOption(name, fallback) {
  const prefix = `--${name}=`;
  const option = process.argv
    .slice(2)
    .find((value) => value.startsWith(prefix));
  return option ? option.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
}

const olderThanDays = Number(readOption("older-than-days", "30"));
if (!Number.isInteger(olderThanDays) || olderThanDays < 1) {
  throw new Error("--older-than-days must be a positive integer");
}

const deleteOrphans = hasFlag("delete-orphans");
const deleteLegacyBuckets = hasFlag("delete-legacy-buckets");
const isConfirmed = readOption("confirm", "") === CONFIRMATION;

if ((deleteOrphans || deleteLegacyBuckets) && !isConfirmed) {
  throw new Error(`Destructive operations require --confirm=${CONFIRMATION}`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listBucketNames() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Cannot list Storage buckets: ${error.message}`);
  return new Set((data ?? []).map((bucket) => bucket.name));
}

async function listFiles(bucket, prefix = "") {
  const files = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);

    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...(await listFiles(bucket, path)));
      } else {
        files.push({
          path,
          createdAt: entry.created_at ?? null,
          updatedAt: entry.updated_at ?? null,
        });
      }
    }

    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return files;
}

async function loadReferencedMomentPaths() {
  const paths = new Set();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("moments")
      .select("id,image_path")
      .not("image_path", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error)
      throw new Error(`Cannot read moment image paths: ${error.message}`);

    for (const row of data ?? []) {
      if (typeof row.image_path === "string" && row.image_path.length > 0) {
        paths.add(row.image_path);
      }
    }

    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return paths;
}

async function removePaths(bucket, paths) {
  for (let index = 0; index < paths.length; index += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(index, index + REMOVE_BATCH_SIZE);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw new Error(`${bucket}: ${error.message}`);
  }
}

const bucketNames = await listBucketNames();
const referencedPaths = await loadReferencedMomentPaths();
const momentFiles = bucketNames.has("moments")
  ? await listFiles("moments")
  : [];
const momentObjectPaths = new Set(momentFiles.map((file) => file.path));
const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
const orphanedMomentFiles = momentFiles.filter((file) => {
  if (referencedPaths.has(file.path)) return false;
  const timestamp = file.updatedAt ?? file.createdAt;
  return timestamp !== null && new Date(timestamp) < cutoff;
});
const missingMomentFiles = [...referencedPaths].filter(
  (path) => !momentObjectPaths.has(path),
);

const legacyBuckets = {};
for (const bucket of LEGACY_BUCKETS) {
  if (!bucketNames.has(bucket)) {
    legacyBuckets[bucket] = { exists: false, objects: 0 };
    continue;
  }
  const files = await listFiles(bucket);
  legacyBuckets[bucket] = { exists: true, objects: files.length };
}

const report = {
  mode: deleteOrphans || deleteLegacyBuckets ? "delete" : "audit",
  cutoff: cutoff.toISOString(),
  moments: {
    bucketExists: bucketNames.has("moments"),
    referencedPaths: referencedPaths.size,
    storedObjects: momentFiles.length,
    oldOrphanCandidates: orphanedMomentFiles.map((file) => file.path),
    missingReferencedObjects: missingMomentFiles,
  },
  legacyBuckets,
};

console.log(JSON.stringify(report, null, 2));

if (deleteOrphans && orphanedMomentFiles.length > 0) {
  await removePaths(
    "moments",
    orphanedMomentFiles.map((file) => file.path),
  );
  console.log(
    `Removed ${orphanedMomentFiles.length} old orphaned moment objects.`,
  );
}

if (deleteLegacyBuckets) {
  for (const bucket of LEGACY_BUCKETS) {
    if (!bucketNames.has(bucket)) continue;
    const { error: emptyError } = await supabase.storage.emptyBucket(bucket);
    if (emptyError) throw new Error(`${bucket}: ${emptyError.message}`);
    const { error: deleteError } = await supabase.storage.deleteBucket(bucket);
    if (deleteError) throw new Error(`${bucket}: ${deleteError.message}`);
    console.log(`Deleted legacy bucket: ${bucket}`);
  }
}
