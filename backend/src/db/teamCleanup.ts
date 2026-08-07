import { eq, notInArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { events, notes, subcontractors, tasks, teamMembers } from "./schema.js";
import type * as schema from "./schema.js";

type Db = BetterSQLite3Database<typeof schema>;

// The only two team members the app should have once cleanup runs. Anyone
// else already in the database is treated as seeded/demo/test data. Shared
// by seed.ts (fresh databases) and cleanupTeam.ts (existing ones) so the two
// paths can never drift apart on what "correct" looks like.
export const REQUIRED_MEMBERS = [
  { name: "Mohammad Khajavi", role: "Manager", initials: "MK" },
  { name: "Linda Roed", role: "Team member", initials: "LR" },
] as const;

export async function upsertRequiredMembers(db: Db): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const required of REQUIRED_MEMBERS) {
    const existing = await db.query.teamMembers.findFirst({ where: eq(teamMembers.name, required.name) });
    if (existing) {
      await db.update(teamMembers).set({ role: required.role, active: true }).where(eq(teamMembers.id, existing.id));
      ids[required.name] = existing.id;
    } else {
      const [created] = await db
        .insert(teamMembers)
        .values({ name: required.name, role: required.role, initials: required.initials, active: true })
        .returning();
      ids[required.name] = created.id;
    }
  }
  return ids;
}

// Idempotent: safe against a fresh database (nothing to remove) or an
// existing one with old demo members. Running it twice in a row is a no-op
// the second time. Every reference is reassigned before the member row is
// deleted, so no foreign key is ever left pointing at a removed member, and
// no supplier, task, event, or note is ever deleted — only re-owned.
export async function runTeamCleanup(db: Db): Promise<{ removed: string[] }> {
  const ids = await upsertRequiredMembers(db);
  const mohammadId = ids["Mohammad Khajavi"];
  const requiredNames = REQUIRED_MEMBERS.map((m) => m.name);

  const demoMembers = await db.query.teamMembers.findMany({
    where: notInArray(teamMembers.name, requiredNames),
  });

  for (const member of demoMembers) {
    await db.update(subcontractors).set({ ownerId: mohammadId }).where(eq(subcontractors.ownerId, member.id));
    await db.update(tasks).set({ ownerId: mohammadId }).where(eq(tasks.ownerId, member.id));
    await db.update(events).set({ ownerId: mohammadId }).where(eq(events.ownerId, member.id));
    await db.update(notes).set({ authorId: mohammadId }).where(eq(notes.authorId, member.id));
    await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
  }

  return { removed: demoMembers.map((m) => m.name) };
}
