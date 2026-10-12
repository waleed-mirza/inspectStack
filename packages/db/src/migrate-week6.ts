import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSqlClient } from "./client";

const file = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20260831180000_week6_ops.sql",
);

export async function applyWeek6Migration() {
  const sql = createSqlClient();
  const text = readFileSync(file, "utf8");
  await sql.unsafe(text);
  await sql.end({ timeout: 5 });
}

if (process.argv[1]?.includes("migrate-week6")) {
  applyWeek6Migration()
    .then(() => {
      console.log("Week 6 migration applied.");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
