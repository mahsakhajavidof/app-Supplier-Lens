import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { notes } from "../db/schema.js";

export const notesRouter = Router();

const createNoteSchema = z.object({
  subcontractorId: z.string().min(1),
  authorId: z.string().optional(),
  text: z.string().min(1),
});

notesRouter.post("/", async (req, res, next) => {
  try {
    const body = createNoteSchema.parse(req.body);
    const [note] = await db.insert(notes).values(body).returning();
    const withAuthor = await db.query.notes.findFirst({ where: eq(notes.id, note.id), with: { author: true } });
    res.status(201).json(withAuthor);
  } catch (err) {
    next(err);
  }
});
