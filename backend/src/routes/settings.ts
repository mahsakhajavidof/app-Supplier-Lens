import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { sources, subcontractors, teamMembers } from "../db/schema.js";
import { listProviders } from "../services/registryProviders/index.js";

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

// Live status of each country registry integration, for the Settings page.
settingsRouter.get("/registries", async (_req, res) => {
  res.json(listProviders());
});
