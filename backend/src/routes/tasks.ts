import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { events, tasks } from "../db/schema.js";
import { serializeTask } from "../lib/labels.js";

export const tasksRouter = Router();

tasksRouter.get("/", async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string | undefined>;
    const rows = await db.query.tasks.findMany({
      where: status ? eq(tasks.status, status as never) : undefined,
      with: { subcontractor: true, owner: true, event: true },
    });
    res.json(rows.map(serializeTask));
  } catch (err) {
    next(err);
  }
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  subcontractorId: z.string().min(1),
  eventId: z.string().optional(),
  ownerId: z.string().optional(),
  due: z.string().optional(), // ISO date
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  comment: z.string().optional(),
});

tasksRouter.post("/", async (req, res, next) => {
  try {
    const body = createTaskSchema.parse(req.body);
    const [task] = await db
      .insert(tasks)
      .values({
        title: body.title,
        subcontractorId: body.subcontractorId,
        eventId: body.eventId,
        ownerId: body.ownerId,
        due: body.due ? new Date(body.due) : undefined,
        priority: body.priority,
        comment: body.comment,
      })
      .returning();
    if (body.eventId) {
      await db.update(events).set({ followUp: "TASK_CREATED" }).where(eq(events.id, body.eventId));
    }
    res.status(201).json(serializeTask(task));
  } catch (err) {
    next(err);
  }
});

const updateTaskSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "WAITING_FOR_INFORMATION", "COMPLETED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  due: z.string().optional(),
});

tasksRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = updateTaskSchema.parse(req.body);
    const [task] = await db
      .update(tasks)
      .set({ ...body, due: body.due ? new Date(body.due) : undefined })
      .where(eq(tasks.id, req.params.id))
      .returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(serializeTask(task));
  } catch (err) {
    next(err);
  }
});
