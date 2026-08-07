import type { NormalizedFinancialYear } from "../registryProviders/types.js";

export type IndicatorStatus = "Positive" | "Neutral" | "Attention" | "High attention";

// Every field a due-diligence reviewer needs to judge the indicator for
// themselves, without taking Supplier Lens's word for it: this is explicitly
// not an official rating, and never drives any automatic accept/reject
// decision on its own.
export interface RiskIndicator {
  key: string;
  title: string;
  status: IndicatorStatus;
  observedValue: string;
  comparisonPeriod: string;
  whyItMatters: string;
  source: string;
  retrievedAt: string;
  ruleUsed: string;
  isInformationGap: boolean;
}

export interface RiskAssessmentInput {
  financials: NormalizedFinancialYear[];
  governanceChangeEvents: { type: string; detectedAt: Date | string }[];
  lastCheckedAt: Date | string;
}

export const REPORTED_SOURCE = "Annual accounts / registry, as reported";
export const CALCULATED_SOURCE = "Calculated by Supplier Lens from reported figures";

export function iso(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

export function latestYear(years: NormalizedFinancialYear[]): NormalizedFinancialYear | undefined {
  return [...years].sort((a, b) => b.year - a.year)[0];
}

/** A rule couldn't be evaluated because the data it needs isn't available —
 * shown as a neutral "information gap", never as evidence of weakness. */
export function informationGap(key: string, title: string, whyItMatters: string, ruleUsed: string, retrievedAt: string): RiskIndicator {
  return {
    key,
    title,
    status: "Neutral",
    observedValue: "Not available",
    comparisonPeriod: "—",
    whyItMatters,
    source: "No data source currently provides this",
    retrievedAt,
    ruleUsed,
    isInformationGap: true,
  };
}
