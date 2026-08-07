import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import * as schema from "./schema.js";
import { REQUIRED_MEMBERS, runTeamCleanup } from "./teamCleanup.js";

// Each test gets its own throwaway SQLite file and its own drizzle instance
// (not the app-wide singleton in db/index.ts), so these tests never touch a
// real database and can't interfere with each other.
function freshDb(name: string) {
  const file = path.resolve(process.cwd(), `${name}.db`);
  if (fs.existsSync(file)) fs.rmSync(file);
  const sqlite = new Database(file);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return { db, sqlite, file };
}

test("REQUIRED_MEMBERS is exactly Mohammad Khajavi (Manager) and Linda Roed (Team member)", () => {
  assert.deepEqual(
    REQUIRED_MEMBERS.map((m) => [m.name, m.role]),
    [
      ["Mohammad Khajavi", "Manager"],
      ["Linda Roed", "Team member"],
    ]
  );
});

test("cleanup on a fresh database creates exactly the two required members and removes nothing", async () => {
  const { db, sqlite } = freshDb("test-team-cleanup-fresh");
  try {
    const { removed } = await runTeamCleanup(db);
    assert.deepEqual(removed, []);
    const members = await db.query.teamMembers.findMany();
    assert.deepEqual(
      members.map((m) => m.name).sort(),
      ["Linda Roed", "Mohammad Khajavi"]
    );
    assert.ok(members.every((m) => m.active));
  } finally {
    sqlite.close();
  }
});

test("cleanup reassigns a demo member's suppliers, tasks, events and notes, then removes them with no orphaned references", async () => {
  const { db, sqlite } = freshDb("test-team-cleanup-reassign");
  try {
    const [demo] = await db
      .insert(schema.teamMembers)
      .values({ name: "Demo Person", role: "Procurement", initials: "DP", active: true })
      .returning();
    const [sub] = await db
      .insert(schema.subcontractors)
      .values({ company: "Acme AS", orgNr: "111111111", category: "Logistics", ownerId: demo.id })
      .returning();
    await db.insert(schema.tasks).values({ title: "Open item", subcontractorId: sub.id, ownerId: demo.id, status: "NOT_STARTED" });
    await db.insert(schema.tasks).values({ title: "Old done item", subcontractorId: sub.id, ownerId: demo.id, status: "COMPLETED" });
    await db
      .insert(schema.events)
      .values({ subcontractorId: sub.id, type: "Test event", description: "desc", attention: "NEW_INFORMATION", source: "Test", ownerId: demo.id });
    await db.insert(schema.notes).values({ subcontractorId: sub.id, authorId: demo.id, text: "note" });

    const { removed } = await runTeamCleanup(db);
    assert.deepEqual(removed, ["Demo Person"]);

    const remaining = await db.query.teamMembers.findMany();
    assert.deepEqual(
      remaining.map((m) => m.name).sort(),
      ["Linda Roed", "Mohammad Khajavi"]
    );
    const mohammad = remaining.find((m) => m.name === "Mohammad Khajavi")!;

    const updatedSub = await db.query.subcontractors.findFirst({ where: eq(schema.subcontractors.id, sub.id) });
    assert.ok(updatedSub, "the supplier itself must be preserved, only re-owned");
    assert.equal(updatedSub!.ownerId, mohammad.id);

    const updatedTasks = await db.query.tasks.findMany({ where: eq(schema.tasks.subcontractorId, sub.id) });
    assert.equal(updatedTasks.length, 2, "no task was deleted, including the completed one");
    assert.ok(updatedTasks.every((t) => t.ownerId === mohammad.id));

    const updatedEvents = await db.query.events.findMany({ where: eq(schema.events.subcontractorId, sub.id) });
    assert.ok(updatedEvents.every((e) => e.ownerId === mohammad.id));

    const updatedNotes = await db.query.notes.findMany({ where: eq(schema.notes.subcontractorId, sub.id) });
    assert.ok(updatedNotes.every((n) => n.authorId === mohammad.id));
  } finally {
    sqlite.close();
  }
});

test("cleanup is idempotent: running it twice makes no further changes and creates no duplicates", async () => {
  const { db, sqlite } = freshDb("test-team-cleanup-idempotent");
  try {
    await db.insert(schema.teamMembers).values({ name: "Old Demo", role: "Finance", initials: "OD", active: true });

    const first = await runTeamCleanup(db);
    assert.deepEqual(first.removed, ["Old Demo"]);

    const second = await runTeamCleanup(db);
    assert.deepEqual(second.removed, []);

    const members = await db.query.teamMembers.findMany();
    assert.equal(members.length, 2);
  } finally {
    sqlite.close();
  }
});
