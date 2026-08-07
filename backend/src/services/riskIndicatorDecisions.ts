import { asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { riskIndicatorDecisions } from "../db/schema.js";

export type DecisionStatus = "NOT_REVIEWED" | "ACCEPTED" | "NOT_RELEVANT" | "RESOLVED";

/**
 * Appends a new decision row rather than updating one in place, so a
 * supplier's decision history is never lost — only the most recent row per
 * indicator is used as the "current" decision (see getCurrentDecisions).
 */
export async function recordDecision(params: {
  subcontractorId: string;
  indicatorKey: string;
  status: DecisionStatus;
  note?: string;
  decidedById?: string;
}) {
  const [row] = await db
    .insert(riskIndicatorDecisions)
    .values({
      subcontractorId: params.subcontractorId,
      indicatorKey: params.indicatorKey,
      status: params.status,
      note: params.note,
      decidedById: params.decidedById,
    })
    .returning();
  return row;
}

/** The current (most recent) decision for every indicator that has ever had
 * one recorded for this supplier, keyed by indicatorKey. An indicator with
 * no entry has never been decided on (implicitly "Not reviewed"). */
export async function getCurrentDecisions(subcontractorId: string) {
  const rows = await db.query.riskIndicatorDecisions.findMany({
    where: eq(riskIndicatorDecisions.subcontractorId, subcontractorId),
    orderBy: [asc(riskIndicatorDecisions.decidedAt)],
    with: { decidedBy: true },
  });
  const current = new Map<string, (typeof rows)[number]>();
  for (const row of rows) current.set(row.indicatorKey, row); // later rows overwrite earlier ones
  return current;
}

/** Full decision history for one indicator, oldest first. */
export async function getDecisionHistory(subcontractorId: string, indicatorKey: string) {
  return db.query.riskIndicatorDecisions.findMany({
    where: (t, { and, eq: eqOp }) => and(eqOp(t.subcontractorId, subcontractorId), eqOp(t.indicatorKey, indicatorKey)),
    orderBy: [asc(riskIndicatorDecisions.decidedAt)],
    with: { decidedBy: true },
  });
}
