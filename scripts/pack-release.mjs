import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = readFileSync(join(root, "VERSION"), "utf8").trim();
const stamp = `inspectstack-${version}`;
const dist = join(root, "dist");
const staging = join(dist, stamp);

const SKIP_DIR = new Set([
  ".git",
  ".temp",
  ".next",
  ".netlify",
  ".turbo",
  ".vercel",
  ".auth",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "blob-report",
  "test-results",
]);

/** Root-only folders (do not skip nested names like docs/release). */
const SKIP_ROOT = new Set(["release"]);

const SKIP_FILE = new Set([
  ".env",
  ".env.local",
  ".supabase-db-password",
  ".supabase-keys.json",
  ".DS_Store",
  "Thumbs.db",
]);

function skipName(name) {
  if (SKIP_DIR.has(name) || SKIP_FILE.has(name)) return true;
  if (name.endsWith(".tsbuildinfo")) return true;
  if (name.startsWith(".env.") && name.endsWith(".local")) return true;
  if (name.startsWith("swe-worker")) return true;
  if (name === "sw.js") return true;
  return false;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (skipName(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

const files = walk(root);
for (const file of files) {
  const rel = relative(root, file);
  const top = rel.split(/[\\/]/)[0];
  if (SKIP_ROOT.has(top)) continue;
  if (rel.includes(`${join("apps", "web", ".env")}`)) continue;
  if (rel.endsWith(".env.local")) continue;
  cpSync(file, join(staging, rel));
}

const zipName = `${stamp}.zip`;
const zipPath = join(dist, zipName);
if (existsSync(zipPath)) rmSync(zipPath);

// Windows: Git Bash GNU tar resolves first on PATH and reads `D:\...` as a
// remote host; use the bundled System32 bsdtar, which writes real zip files.
const systemTar = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
const tarExe = process.platform === "win32" && existsSync(systemTar) ? systemTar : "tar";
const tar = spawnSync(tarExe, ["-a", "-cf", zipPath, "-C", dist, stamp], {
  stdio: "inherit",
  shell: true,
});
if (tar.status !== 0) {
  console.error(`tar failed (used ${tarExe}); is BSD tar available?`);
  process.exit(tar.status ?? 1);
}

const bytes = readFileSync(zipPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const checksumPath = join(dist, `${stamp}.sha256`);
writeFileSync(checksumPath, `${sha256}  ${zipName}\n`);
writeFileSync(join(dist, `${stamp}.files.txt`), `${files.length} files staged\n`);

console.log(`Wrote ${zipPath}`);
console.log(`SHA-256 ${sha256}`);
console.log(`Files staged: ${files.length}`);
