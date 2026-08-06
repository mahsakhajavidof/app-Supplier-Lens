import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { events } from "../db/schema.js";
import { serializeEvent } from "../lib/labels.js";

export const eventsRouter = Router();

// GET /api/events?attention=&followUp=
eventsRouter.get("/", async (req, res, next) => {
  try {
    const { attention, followUp } = req.query as Record<string, string | undefined>;
    const rows = await db.query.events.findMany({
      where: and(
        attention ? eq(events.attention, attention as never) : undefined,
        followUp ? eq(events.followUp, followUp as never) : undefined
      ),
      with: { subcontractor: true, owner: true },
      orderBy: [desc(events.detectedAt)],
    });
    res.json(rows.map(serializeEvent));
  } catch (err) {
    next(err);
  }
});

eventsRouter.patch("/:id/review", async (req, res, next) => {
  try {
    const [event] = await db
      .update(events)
      .set({ reviewed: true, followUp: "REVIEWED" })
      .where(eq(events.id, req.params.id))
      .returning();
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(serializeEvent(event));
  } catch (err) {
    next(err);
  }
});
