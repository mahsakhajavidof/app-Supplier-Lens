import { THRESHOLDS } from "./thresholds.js";
import { informationGap, iso } from "./indicatorTypes.js";
import type { RiskAssessmentInput, RiskIndicator } from "./indicatorTypes.js";

const GOVERNANCE_EVENT_TYPES = ["Managing director changed", "Auditor changed", "Ownership changed", "Management changed"];

export function governanceChangeIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const cutoff = new Date(retrievedAt);
  cutoff.setMonth(cutoff.getMonth() - THRESHOLDS.governanceChangeLookbackMonths);
  const recent = input.governanceChangeEvents.filter(
    (e) => GOVERNANCE_EVENT_TYPES.includes(e.type) && new Date(e.detectedAt) >= cutoff
  );
  const rule = `Attention when an ownership, management, or auditor change was detected in the last ${THRESHOLDS.governanceChangeLookbackMonths} months.`;
  return {
    key: "governance_changes",
    title: "Ownership / management / auditor changes",
    status: recent.length > 0 ? "Attention" : "Neutral",
    observedValue: recent.length > 0 ? recent.map((e) => e.type).join(", ") : "No changes detected in the lookback window",
    comparisonPeriod: `Last ${THRESHOLDS.governanceChangeLookbackMonths} months`,
    whyItMatters: "Governance changes can precede shifts in strategy, reliability, or financial reporting.",
    source: "Monitoring event history",
    retrievedAt,
    ruleUsed: rule,
    isInformationGap: false,
  };
}

/** Supplier Lens has no data source for customer/revenue concentration — an
 * explicit information gap rather than a silent omission. */
export function dependencyRiskIndicator(input: RiskAssessmentInput): RiskIndicator {
  return informationGap(
    "dependency_risk",
    "Customer / revenue dependency",
    "Heavy reliance on a small number of customers or contracts increases exposure to their decisions.",
    "Not assessed — no connected data source reports customer or revenue concentration.",
    iso(input.lastCheckedAt)
  );
}
