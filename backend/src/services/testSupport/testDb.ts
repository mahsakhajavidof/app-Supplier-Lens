import fs from "node:fs";
import path from "node:path";

/**
 * Points the app's singleton database (db/index.ts) at a fresh, empty
 * SQLite file and applies migrations to it, then returns that singleton.
 *
 * db/index.ts opens its connection at module-evaluation time, using
 * whatever DATABASE_URL is set at that instant — so this only works if
 * called before anything else in the process has imported db/index.ts
 * (directly or transitively). Callers must therefore import every module
 * under test dynamically (`await import(...)`), never with a static
 * `import` statement, so this function's own dynamic import is guaranteed
 * to be the first one. Node's test runner gives each *.test.ts file its
 * own process, so different test files never share a database file.
 */
export async function freshSingletonDb(name: string) {
  const file = path.resolve(process.cwd(), `${name}.db`);
  for (const suffix of ["", "-wal", "-shm"]) {
    if (fs.existsSync(file + suffix)) fs.rmSync(file + suffix);
  }
  process.env.DATABASE_URL = `file:./${name}.db`;
  const dbModule = await import("../../db/index.js");
  dbModule.runMigrations();
  return dbModule.db;
}
