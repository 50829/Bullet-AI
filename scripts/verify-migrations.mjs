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

const numbered = files.map((file) => ({
  file,
  number: Number(file.slice(0, 3)),
}));
const duplicateNumbers = numbered.filter(
  ({ number }, index) =>
    numbered.findIndex((candidate) => candidate.number === number) !== index,
);
if (duplicateNumbers.length > 0) {
  throw new Error(
    `Migration numbers must be unique: ${duplicateNumbers.map(({ file }) => file).join(",")}`,
  );
}

const forward = files.filter((file) => Number(file.slice(0, 3)) >= 6);
forward.forEach((file, index) => {
  const expectedNumber = index + 6;
  if (Number(file.slice(0, 3)) !== expectedNumber) {
    throw new Error(
      `Forward migrations must be contiguous from 006; expected ${String(expectedNumber).padStart(3, "0")}, found ${file}`,
    );
  }
});
const expectedFresh = ["000_current_schema.sql", ...forward];
if (JSON.stringify(manifest.freshInstall) !== JSON.stringify(expectedFresh)) {
  throw new Error(
    "freshInstall must contain 000 followed by every forward migration",
  );
}
if (manifest.appliedBaseline !== "005_domain_schema_v2.sql") {
  throw new Error("appliedBaseline must record 005_domain_schema_v2.sql");
}
if (manifest.productionAppliedThrough !== forward.at(-1)) {
  throw new Error(
    "productionAppliedThrough must record the latest forward migration",
  );
}
if (files.some((file) => /^00[1-4]_/.test(file))) {
  throw new Error("Retired migrations 001-004 must not be restored");
}

const seedSection = supabaseConfig.match(
  /\[db\.seed\]([\s\S]*?)(?=\n\[[^\]]+\]|$)/,
)?.[1];
const seedPaths = seedSection
  ? [...seedSection.matchAll(/"\.\.\/db\/migrations\/([^"]+\.sql)"/g)].map(
      (match) => match[1],
    )
  : [];
if (JSON.stringify(seedPaths) !== JSON.stringify(manifest.freshInstall)) {
  throw new Error(
    "supabase/config.toml seed paths must match the freshInstall manifest",
  );
}

console.log(
  `Verified ${files.length} immutable SQL files; forward chain: ${forward.join(", ")}`,
);
