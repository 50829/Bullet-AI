import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const migrationsDirectory = join(root, "db", "migrations");
const manifest = JSON.parse(
  await readFile(join(root, "db", "migration-manifest.json"), "utf8"),
);
const supabaseConfig = await readFile(
  join(root, "supabase", "config.toml"),
  "utf8",
);
const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const manifestFiles = Object.keys(manifest.sha256).sort();

if (JSON.stringify(files) !== JSON.stringify(manifestFiles)) {
  throw new Error(
    `Migration manifest mismatch. Files=${files.join(",")} manifest=${manifestFiles.join(",")}`,
  );
}

for (const file of files) {
  if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(file)) {
    throw new Error(`Invalid migration filename: ${file}`);
  }
  const contents = await readFile(join(migrationsDirectory, file));
  const digest = createHash("sha256").update(contents).digest("hex");
  if (digest !== manifest.sha256[file]) {
    throw new Error(
      `${file} changed after being recorded. Add a forward migration instead of rewriting history.`,
    );
  }
}

if (manifest.initialization !== "000_current_schema.sql") {
  throw new Error("initialization must be 000_current_schema.sql");
}

const seedSection = supabaseConfig.match(
  /\[db\.seed\]([\s\S]*?)(?=\n\[[^\]]+\]|$)/,
)?.[1];
const seedPaths = seedSection
  ? [...seedSection.matchAll(/"\.\.\/db\/migrations\/([^"]+\.sql)"/g)].map(
      (match) => match[1],
    )
  : [];
if (JSON.stringify(seedPaths) !== JSON.stringify([manifest.initialization])) {
  throw new Error(
    "supabase/config.toml must initialize the database from 000_current_schema.sql",
  );
}

console.log(
  `Verified ${files.length} SQL files; initialization: ${manifest.initialization}`,
);
