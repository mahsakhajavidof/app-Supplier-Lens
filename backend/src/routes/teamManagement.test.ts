import assert from "node:assert/strict";
import test, { after } from "node:test";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";

// This file exercises the real Express routes (including the requireManager
// middleware) over real HTTP, against a throwaway database — the only way to
// genuinely prove a non-manager request is rejected server-side, not just
// hidden behind a UI button. DATABASE_URL must be set before db/index.js is
// ever imported (it opens its connection at module-load time), so these are
// dynamic imports rather than static ones.
const TEST_DB = path.resolve(process.cwd(), "test-team-management.db");
for (const p of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
  if (fs.existsSync(p)) fs.rmSync(p);
}
process.env.DATABASE_URL = `file:./${path.basename(TEST_DB)}`;

const { runMigrations, db } = await import("../db/index.js");
const { createApp } = await import("../app.js");
const { teamMembers, subcontractors, tasks } = await import("../db/schema.js");
const { eq } = await import("drizzle-orm");

runMigrations();
// Bind to loopback explicitly (not all interfaces) so this doesn't trigger
// a Windows Firewall prompt in CI/local environments.
const server = createApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

async function addMember(name: string, role: string, active = true) {
  const [m] = await db
    .insert(teamMembers)
    .values({ name, role, initials: name.slice(0, 2).toUpperCase(), active })
    .returning();
  return m;
}

function actingAs(id: string) {
  return { "Content-Type": "application/json", "x-team-member-id": id };
}

async function jsonOf(res: Response): Promise<any> {
  return res.json();
}

test("a manager can add a team member; a non-manager cannot", async () => {
  const manager = await addMember("Add Manager", "Manager");
  const member = await addMember("Add Member", "Team member");

  const denied = await fetch(`${base}/settings/team`, {
    method: "POST",
    headers: actingAs(member.id),
    body: JSON.stringify({ name: "Nope", role: "Team member" }),
  });
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${base}/settings/team`, {
    method: "POST",
    headers: actingAs(manager.id),
    body: JSON.stringify({ name: "New Person", role: "Team member" }),
  });
  assert.equal(allowed.status, 201);
  assert.equal((await jsonOf(allowed)).name, "New Person");
});

test("a manager can edit a member's name and role; a non-manager cannot", async () => {
  const manager = await addMember("Edit Manager", "Manager");
  const member = await addMember("Edit Member", "Team member");
  const target = await addMember("Edit Target", "Team member");

  const denied = await fetch(`${base}/settings/team/${target.id}`, {
    method: "PATCH",
    headers: actingAs(member.id),
    body: JSON.stringify({ role: "Finance" }),
  });
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${base}/settings/team/${target.id}`, {
    method: "PATCH",
    headers: actingAs(manager.id),
    body: JSON.stringify({ name: "Renamed Target", role: "Finance" }),
  });
  assert.equal(allowed.status, 200);
  const updated = await jsonOf(allowed);
  assert.equal(updated.name, "Renamed Target");
  assert.equal(updated.role, "Finance");
});

test("deactivating a member with assigned suppliers/open tasks requires reassignToId, then reassigns and deactivates", async () => {
  const manager = await addMember("Deactivate Manager", "Manager");
  const leaving = await addMember("Leaving Person", "Team member");
  const receiving = await addMember("Receiving Person", "Team member");

  const [sub] = await db
    .insert(subcontractors)
    .values({ company: "Test Co AS", orgNr: "222222222", category: "Logistics", ownerId: leaving.id })
    .returning();
  await db.insert(tasks).values({ title: "Open item", subcontractorId: sub.id, ownerId: leaving.id, status: "NOT_STARTED" });

  const blocked = await fetch(`${base}/settings/team/${leaving.id}`, {
    method: "PATCH",
    headers: actingAs(manager.id),
    body: JSON.stringify({ active: false }),
  });
  assert.equal(blocked.status, 409);

  const ok = await fetch(`${base}/settings/team/${leaving.id}`, {
    method: "PATCH",
    headers: actingAs(manager.id),
    body: JSON.stringify({ active: false, reassignToId: receiving.id }),
  });
  assert.equal(ok.status, 200);
  assert.equal((await jsonOf(ok)).active, false);

  const movedSub = await db.query.subcontractors.findFirst({ where: eq(subcontractors.id, sub.id) });
  assert.equal(movedSub!.ownerId, receiving.id);
  const movedTasks = await db.query.tasks.findMany({ where: eq(tasks.subcontractorId, sub.id) });
  assert.ok(movedTasks.every((t) => t.ownerId === receiving.id));
});

test("a manager can reassign a supplier's owner; a non-manager cannot", async () => {
  const manager = await addMember("Assign Manager", "Manager");
  const member = await addMember("Assign Member", "Team member");
  const newOwner = await addMember("New Owner", "Team member");
  const [sub] = await db.insert(subcontractors).values({ company: "Reassign Co AS", orgNr: "333333333", category: "ITC" }).returning();

  const denied = await fetch(`${base}/subcontractors/${sub.id}`, {
    method: "PATCH",
    headers: actingAs(member.id),
    body: JSON.stringify({ ownerId: newOwner.id }),
  });
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${base}/subcontractors/${sub.id}`, {
    method: "PATCH",
    headers: actingAs(manager.id),
    body: JSON.stringify({ ownerId: newOwner.id }),
  });
  assert.equal(allowed.status, 200);
  assert.equal((await jsonOf(allowed)).owner.id, newOwner.id);
});

after(() => {
  server.close();
  // Best-effort: the sqlite connection (owned by the db/index.js singleton)
  // may still hold the file open here. It's released once this process
  // exits, and the next run's setup above clears these files anyway.
  for (const p of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    try {
      if (fs.existsSync(p)) fs.rmSync(p);
    } catch {
      // ignored — see comment above
    }
  }
});
