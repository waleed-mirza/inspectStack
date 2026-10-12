import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const from = resolve(root, ".env.local");
const to = resolve(root, "apps/web/.env.local");

if (!existsSync(from)) {
  console.error("Missing .env.local at repo root. Copy .env.example first.");
  process.exit(1);
}

copyFileSync(from, to);
console.log("Copied .env.local -> apps/web/.env.local (Next.js only loads app-dir env).");
