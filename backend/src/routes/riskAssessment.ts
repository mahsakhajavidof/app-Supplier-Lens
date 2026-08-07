import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { tasks } from "../db/schema.js";
import { serializeDecision, serializeTask } from "../lib/labels.js";
import { assembleRiskAssessment } from "../services/riskAssessment/assemble.js";
import { generateNegotiationBrief } from "../services/riskAssessment/negotiationBrief.js";
import { recordDecision } from "../services/riskIndicatorDecisions.js";

export const riskAssessmentRouter = Router();

type RiskAssessmentResult = NonNullable<Awaited<ReturnType<typeof assembleRiskAssessment>>>;

function serializeDecisions(decisions: RiskAssessmentResult["decisions"]) {
  return Array.from(decisions.values()).map((d) => ({
    ...serializeDecision(d),
    decidedBy: d.decidedBy ? { id: d.decidedBy.id, name: d.decidedBy.name } : null,
  }));
}

// GET /api/subcontractors/:id/risk-assessment
riskAssessmentRouter.get("/:id/risk-assessment", async (req, res, next) => {
  try {
    const result = await assembleRiskAssessment(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Subcontractor not found" });
      return;
    }
    res.json({ metrics: result.metrics, indicators: result.indicators, guidance: result.guidance, decisions: serializeDecisions(result.decisions) });
  } catch (err) {
    next(err);
  }
});

// GET /api/subcontractors/:id/risk-assessment/brief — a deterministic
// markdown document assembled from the same indicators/guidance above.
riskAssessmentRouter.get("/:id/risk-assessment/brief", async (req, res, next) => {
  try {
    const result = await assembleRiskAssessment(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Subcontractor not found" });
      return;
    }
    const brief = generateNegotiationBrief({
      companyName: result.sub.company,
      orgNr: result.sub.orgNr,
      country: result.sub.country,
      category: result.sub.category,
      ownerName: result.sub.owner?.name,
      lastCheckedAt: result.sub.lastCheckedAt,
      indicators: result.indicators,
      guidance: result.guidance,
    });
    res.json({ brief });
  } catch (err) {
    next(err);
  }
});

const decisionSchema = z.object({
  status: z.enum(["NOT_REVIEWED", "ACCEPTED", "NOT_RELEVANT", "RESOLVED"]),
  note: z.string().optional(),
  decidedById: z.string().optional(),
});

// POST /api/subcontractors/:id/risk-assessment/indicators/:key/decision
// A note is required when dismissing ("Not relevant") an indicator that is
// currently Attention or High attention — every other decision's note stays
// optional.
riskAssessmentRouter.post("/:id/risk-assessment/indicators/:key/decision", async (req, res, next) => {
  try {
    const body = decisionSchema.parse(req.body);
    const result = await assembleRiskAssessment(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Subcontractor not found" });
      return;
    }
    const indicator = result.indicators.find((i) => i.key === req.params.key);
    if (!indicator) {
      res.status(404).json({ error: `Unknown risk indicator "${req.params.key}"` });
      return;
    }
    const isImportant = indicator.status === "Attention" || indicator.status === "High attention";
    if (body.status === "NOT_RELEVANT" && isImportant && !body.note?.trim()) {
      res.status(400).json({ error: "A note is required when dismissing an Attention/High attention indicator as not relevant." });
      return;
    }
    const decision = await recordDecision({
      subcontractorId: req.params.id,
      indicatorKey: req.params.key,
      status: body.status,
      note: body.note,
      decidedById: body.decidedById,
    });
    res.status(201).json(serializeDecision(decision));
  } catch (err) {
    next(err);
  }
});

const convertToTaskSchema = z.object({
  ownerId: z.string().optional(),
  due: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
});

// POST /api/subcontractors/:id/risk-assessment/indicators/:key/convert-to-task
// Creates a follow-up task pre-filled from the indicator's own evidence,
// linked back to it via `sourceIndicatorKey` — the same task list and
// follow-up workflow used everywhere else in the app.
riskAssessmentRouter.post("/:id/risk-assessment/indicators/:key/convert-to-task", async (req, res, next) => {
  try {
    const body = convertToTaskSchema.parse(req.body);
    const result = await assembleRiskAssessment(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Subcontractor not found" });
      return;
    }
    const indicator = result.indicators.find((i) => i.key === req.params.key);
    if (!indicator) {
      res.status(404).json({ error: `Unknown risk indicator "${req.params.key}"` });
      return;
    }
    const [task] = await db
      .insert(tasks)
      .values({
        title: `Follow up: ${indicator.title}`,
        subcontractorId: req.params.id,
        sourceIndicatorKey: indicator.key,
        ownerId: body.ownerId,
        due: body.due ? new Date(body.due) : undefined,
        priority: body.priority ?? "NORMAL",
        comment: `${indicator.whyItMatters} Observed: ${indicator.observedValue} (${indicator.comparisonPeriod}). Source: ${indicator.source}.`,
      })
      .returning();
    res.status(201).json(serializeTask({ ...task, event: undefined }));
  } catch (err) {
    next(err);
  }
});
