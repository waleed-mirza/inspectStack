import { createDb, type Database } from "@inspectstack/db";

const globalForDb = globalThis as { inspectstackDb?: Database };

export function getDb(): Database {
  if (!globalForDb.inspectstackDb) {
    globalForDb.inspectstackDb = createDb();
  }
  return globalForDb.inspectstackDb;
}
