import { Router } from "express";
import { desc, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import { events, tasks } from "../db/schema.js";
import { serializeEvent, serializeTask } from "../lib/labels.js";
import { formatDate } from "../lib/format.js";

export const reportsRouter = Router();

export const REPORT_TYPES = [
  { id: "weekly-summary", title: "Weekly monitoring summary", desc: "All changes detected during the week, grouped by subcontractor and source." },
  { id: "monthly-management", title: "Monthly management report", desc: "Overview for leadership: volume of changes, follow-up status and open activities." },
  { id: "open-follow-up", title: "Open follow-up report", desc: "All unresolved tasks with owner, due date and related monitoring event." },
  { id: "organisational-changes", title: "Recent organisational changes", desc: "Management, board, ownership and registration changes for the period." },
  { id: "financial-changes", title: "Recent financial changes", desc: "Submitted accounts, credit information updates and registered charges." },
] as const;

reportsRouter.get("/types", (_req, res) => {
  res.json(REPORT_TYPES);
});

interface EventForCsv {
  type: string;
  attention: string;
  followUp: string;
  detectedAt: Date;
  source: string;
  previousValue?: string | null;
  currentValue?: string | null;
  subcontractor?: { company: string; orgNr: string } | null;
  owner?: { name: string } | null;
}

interface TaskForCsv {
  title: string;
  due?: Date | null;
  priority: string;
  status: string;
  comment?: string | null;
  subcontractor?: { company: string } | null;
  owner?: { name: string } | null;
  event?: { type: string } | null;
}

// Flattens an event/subcontractor pair into the columns a CSV export wants —
// nested objects (subcontractor, owner) don't serialize sensibly to CSV, so
// this is the one place that decides which fields become columns.
function eventRow(e: EventForCsv) {
  return {
    subcontractor: e.subcontractor?.company ?? "",
    orgNr: e.subcontractor?.orgNr ?? "",
    type: e.type,
    attention: e.attention,
    followUp: e.followUp,
    detected: formatDate(e.detectedAt),
    source: e.source,
    owner: e.owner?.name ?? "",
    previousValue: e.previousValue ?? "",
    currentValue: e.currentValue ?? "",
  };
}

function taskRow(t: TaskForCsv) {
  return {
    title: t.title,
    subcontractor: t.subcontractor?.company ?? "",
    relatedEvent: t.event?.type ?? "",
    owner: t.owner?.name ?? "",
    due: formatDate(t.due),
    priority: t.priority,
    status: t.status,
    comment: t.comment ?? "",
  };
}

// GET /api/reports/:type?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns report rows already flattened for CSV; the frontend hands this
// straight to a downloadable CSV client-side (see lib/format.ts#downloadCsv).
reportsRouter.get("/:type", async (req, res, next) => {
  try {
    const { from, to } = req.query as Record<string, string | undefined>;
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    switch (req.params.type) {
      case "weekly-summary":
      case "organisational-changes":
      case "financial-changes": {
        const rows = (
          await db.query.events.findMany({
            with: { subcontractor: true, owner: true },
            orderBy: [desc(events.detectedAt)],
          })
        )
          .filter((e) => e.detectedAt >= fromDate && e.detectedAt <= toDate)
          .map((e) => eventRow(serializeEvent(e)));
        res.json({ type: req.params.type, rows });
        return;
      }
      case "open-follow-up": {
        const rows = (
          await db.query.tasks.findMany({
            where: ne(tasks.status, "COMPLETED"),
            with: { subcontractor: true, owner: true, event: true },
          })
        ).map((t) => taskRow(serializeTask(t)));
        res.json({ type: req.params.type, rows });
        return;
      }
      case "monthly-management": {
        const [allEvents, openTasks, allSubs] = await Promise.all([
          db.query.events.findMany(),
          db.query.tasks.findMany({ where: ne(tasks.status, "COMPLETED") }),
          db.query.subcontractors.findMany(),
        ]);
        const eventsInPeriod = allEvents.filter((e) => e.detectedAt >= fromDate && e.detectedAt <= toDate).length;
        res.json({
          type: req.params.type,
          rows: [{ subcontractors: allSubs.length, eventsInPeriod, openTasks: openTasks.length }],
        });
        return;
      }
      default:
        res.status(404).json({ error: "Unknown report type" });
    }
  } catch (err) {
    next(err);
  }
});
