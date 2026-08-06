import { Router } from "express";
import { desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { events } from "../db/schema.js";
import { serializeEvent } from "../lib/labels.js";
import { decorateSubcontractor } from "../lib/subcontractorSerialization.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const [allSubs, allEvents, allTasks, recentEvents] = await Promise.all([
      db.query.subcontractors.findMany(),
      db.query.events.findMany(),
      db.query.tasks.findMany(),
      db.query.events.findMany({
        limit: 7,
        orderBy: [desc(events.detectedAt)],
        with: { subcontractor: true, owner: true },
      }),
    ]);

    const categories = new Set(allSubs.map((s) => s.category));
    const newChanges = allEvents.filter((e) => e.detectedAt >= thirtyDaysAgo).length;
    const reviewRecommended = allEvents.filter((e) => e.attention === "REVIEW_RECOMMENDED" && !e.reviewed).length;
    const openTasks = allTasks.filter((t) => t.status !== "COMPLETED");
    const dueSoon = openTasks.filter((t) => t.due && t.due <= fourteenDaysFromNow);

    const reviewCandidateIds = Array.from(
      new Set(
        allEvents
          .filter((e) => e.attention === "REVIEW_RECOMMENDED" && !e.reviewed)
          .map((e) => e.subcontractorId)
      )
    ).slice(0, 3);
    const reviewCandidates = await db.query.subcontractors.findMany({
      where: reviewCandidateIds.length
        ? (t, { inArray }) => inArray(t.id, reviewCandidateIds)
        : (t, { eq }) => eq(t.id, "__none__"),
      with: { owner: true, events: { orderBy: [desc(events.detectedAt)] } },
    });

    res.json({
      monitoredSubcontractors: allSubs.length,
      categoriesCount: categories.size,
      newChangesLast30Days: newChanges,
      reviewRecommended,
      openFollowUpTasks: openTasks.length,
      tasksDueWithin14Days: dueSoon.length,
      recentEvents: recentEvents.map(serializeEvent),
      reviewCandidates: reviewCandidates.map(decorateSubcontractor),
    });
  } catch (err) {
    next(err);
  }
});
