import { Router } from "express";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { sources, subcontractors, tasks, teamMembers } from "../db/schema.js";
import { listProviders } from "../services/registryProviders/index.js";
import { requireManager } from "../lib/permissions.js";
import { getCompanyDataStatus } from "../services/companyData.js";

export const settingsRouter = Router();

settingsRouter.get("/sources", async (_req, res, next) => {
  try {
    res.json(await db.query.sources.findMany());
  } catch (err) {
    next(err);
  }
});

settingsRouter.patch("/sources/:id", async (req, res, next) => {
  try {
    const source = await db.query.sources.findFirst({ where: eq(sources.id, req.params.id) });
    if (!source) {
      res.status(404).json({ error: "Source not found" });
      return;
    }
    const [updated] = await db
      .update(sources)
      .set({ enabled: !source.enabled })
      .where(eq(sources.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

settingsRouter.get("/team", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        email: teamMembers.email,
        role: teamMembers.role,
        initials: teamMembers.initials,
        active: teamMembers.active,
        assignedCount: sql<number>`count(${subcontractors.id})`.as("assigned_count"),
      })
      .from(teamMembers)
      .leftJoin(subcontractors, eq(subcontractors.ownerId, teamMembers.id))
      .groupBy(teamMembers.id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const createTeamMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email().optional(),
});

// POST /api/settings/team — add a team member. Manager-only.
settingsRouter.post("/team", requireManager, async (req, res, next) => {
  try {
    const body = createTeamMemberSchema.parse(req.body);
    const [created] = await db
      .insert(teamMembers)
      .values({ name: body.name, role: body.role, email: body.email, initials: initialsFor(body.name) })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

const updateTeamMemberSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  active: z.boolean().optional(),
  // Required when deactivating a member who still owns suppliers or open
  // tasks — see the reassignment check below.
  reassignToId: z.string().optional(),
});

// PATCH /api/settings/team/:id — edit a member, or activate/deactivate.
// Manager-only. Deactivating a member with assigned suppliers or open tasks
// requires `reassignToId` so nothing is left owned by an inactive member.
settingsRouter.patch("/team/:id", requireManager, async (req, res, next) => {
  try {
    const body = updateTeamMemberSchema.parse(req.body);
    const member = await db.query.teamMembers.findFirst({ where: eq(teamMembers.id, req.params.id) });
    if (!member) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    if (body.active === false && member.active) {
      const [ownedSubs, openTasks] = await Promise.all([
        db.query.subcontractors.findMany({ where: eq(subcontractors.ownerId, member.id) }),
        db.query.tasks.findMany({ where: and(eq(tasks.ownerId, member.id), ne(tasks.status, "COMPLETED")) }),
      ]);
      if (ownedSubs.length > 0 || openTasks.length > 0) {
        if (!body.reassignToId) {
          res.status(409).json({
            error: `${member.name} has ${ownedSubs.length} assigned supplier(s) and ${openTasks.length} open task(s). Provide reassignToId to reassign them before deactivating.`,
          });
          return;
        }
        const target = await db.query.teamMembers.findFirst({ where: eq(teamMembers.id, body.reassignToId) });
        if (!target || !target.active || target.id === member.id) {
          res.status(400).json({ error: "reassignToId must be a different, active team member." });
          return;
        }
        await db.update(subcontractors).set({ ownerId: target.id }).where(eq(subcontractors.ownerId, member.id));
        await db
          .update(tasks)
          .set({ ownerId: target.id })
          .where(and(eq(tasks.ownerId, member.id), ne(tasks.status, "COMPLETED")));
      }
    }

    const [updated] = await db
      .update(teamMembers)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      })
      .where(eq(teamMembers.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Live status of each country registry integration, for the Settings page.
settingsRouter.get("/registries", async (_req, res) => {
  res.json(listProviders());
});

// Safe CompanyData.dk configuration status — never touches the key's value,
// only whether one is present. See services/companyData.ts.
settingsRouter.get("/companydata-status", async (_req, res) => {
  res.json(getCompanyDataStatus());
});
