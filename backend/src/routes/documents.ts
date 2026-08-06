import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { documents } from "../db/schema.js";

export const documentsRouter = Router();

// Records document metadata only — this MVP doesn't wire up real file
// storage (S3, etc.). Swap this handler for one that accepts a multipart
// upload and writes to your storage of choice when you're ready.
const createDocSchema = z.object({
  subcontractorId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  validUntil: z.string().optional(),
  note: z.string().optional(),
});

documentsRouter.post("/", async (req, res, next) => {
  try {
    const body = createDocSchema.parse(req.body);
    const [doc] = await db
      .insert(documents)
      .values({ ...body, validUntil: body.validUntil ? new Date(body.validUntil) : undefined })
      .returning();
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});
