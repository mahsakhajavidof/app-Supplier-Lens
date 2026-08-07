import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { teamMembers } from "../db/schema.js";

// The exact `role` string that grants manager access. Any other role value
// (e.g. "Team member", or a department like "Procurement") is non-manager.
const MANAGER_ROLE = "Manager";

export function isManagerRole(role: string): boolean {
  return role === MANAGER_ROLE;
}

// There's no sign-in system yet — this app has exactly one local operator
// and nothing to authenticate against. Until real auth exists, the caller
// identifies who they're acting as via this header, and this middleware is
// the ONE place that turns that identity into a manager/non-manager
// decision. The check runs on the server, not just in the UI, so it can't
// be bypassed by hiding a button — and swapping this header read for the
// authenticated session's user id later is a one-line change with no
// callers to update.
export const requireManager: RequestHandler = async (req, res, next) => {
  const actingId = req.header("x-team-member-id");
  if (!actingId) {
    res.status(401).json({ error: "Missing acting team member (x-team-member-id header)." });
    return;
  }
  const actor = await db.query.teamMembers.findFirst({ where: eq(teamMembers.id, actingId) });
  if (!actor || !actor.active || !isManagerRole(actor.role)) {
    res.status(403).json({ error: "Only an active manager can perform this action." });
    return;
  }
  next();
};
