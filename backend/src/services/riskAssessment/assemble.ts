import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { subcontractors } from "../../db/schema.js";
import { computeFinancialMetrics } from "./financialMetrics.js";
import { evaluateRiskIndicators } from "./indicators.js";
import { generateNegotiationGuidance } from "./negotiationGuidance.js";
import { getCurrentDecisions } from "../riskIndicatorDecisions.js";
import type { RiskAssessmentInput } from "./indicatorTypes.js";

/**
 * Loads a subcontractor's financials/events and runs the full deterministic
 * pipeline (metrics -> indicators -> guidance -> current decisions) in one
 * place, so the risk-assessment route and the negotiation-brief route
 * compute identical results from identical data.
 */
export async function assembleRiskAssessment(subcontractorId: string) {
  const sub = await db.query.subcontractors.findFirst({
    where: eq(subcontractors.id, subcontractorId),
    with: { financials: true, events: true, owner: true },
  });
  if (!sub) return null;

  const input: RiskAssessmentInput = {
    financials: sub.financials.map((f) => ({
      year: f.year,
      currency: f.currency ?? undefined,
      operatingRevenue: f.operatingRevenue ?? undefined,
      operatingResult: f.operatingResult ?? undefined,
      resultBeforeTax: f.resultBeforeTax ?? undefined,
      equityRatio: f.equityRatio ?? undefined,
      liquidityRatio: f.liquidityRatio ?? undefined,
      employees: f.employees ?? undefined,
    })),
    governanceChangeEvents: sub.events.map((e) => ({ type: e.type, detectedAt: e.detectedAt })),
    lastCheckedAt: sub.lastCheckedAt,
  };

  const metrics = computeFinancialMetrics(input.financials);
  const indicators = evaluateRiskIndicators(input);
  const guidance = generateNegotiationGuidance(indicators);
  const decisions = await getCurrentDecisions(subcontractorId);

  return { sub, metrics, indicators, guidance, decisions };
}
