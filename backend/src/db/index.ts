import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import * as schema from "./schema.js";

const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
const sqlite = new Database(path.resolve(process.cwd(), dbPath));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

/** Applies any pending migrations from ./drizzle. Called once on server start. */
export function runMigrations() {
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}
