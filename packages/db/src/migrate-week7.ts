import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSqlClient } from "./client";

const file = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20260831220000_week7_harden.sql",
);

export async function applyWeek7Migration() {
  const sql = createSqlClient();
  const text = readFileSync(file, "utf8");
  await sql.unsafe(text);
  await sql.end({ timeout: 5 });
}

if (process.argv[1]?.includes("migrate-week7")) {
  applyWeek7Migration()
    .then(() => {
      console.log("Week 7 migration applied.");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
