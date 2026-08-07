import type { RiskIndicator } from "./indicatorTypes.js";

// Deterministic, template-based negotiation/due-diligence guidance — no
// external AI call, no API key, same output for the same indicators every
// time. Guardrails (enforced by construction, not by review after the
// fact): every suggestion is phrased as something to ask/discuss/request,
// never an accusation of misconduct or insolvency, never a legal
// conclusion, never advice to exploit financial distress, and always ties
// back to a specific observed figure or an explicit information gap.
export interface NegotiationSuggestion {
  key: string;
  category: string;
  guidance: string;
  evidenceSummary: string;
  basedOnIndicatorKey: string;
}

type Template = (i: RiskIndicator) => string;

const CONCERN_TEMPLATES: Record<string, Template> = {
  liquidity_ratio: (i) => `Consider discussing payment terms and confirming short-term liquidity, given a reported liquidity ratio of ${i.observedValue} for ${i.comparisonPeriod}.`,
  equity_ratio: (i) => `Consider requesting more recent financial information or discussing capital structure, given a reported equity position of ${i.observedValue} for ${i.comparisonPeriod}.`,
  revenue_trend: (i) => `Consider asking about the business context behind the reported revenue trend (${i.observedValue} for ${i.comparisonPeriod}) before committing to a long-term agreement.`,
  leverage: (i) => `Consider discussing financing arrangements, given an implied leverage level of ${i.observedValue} calculated from reported figures for ${i.comparisonPeriod}.`,
  headcount_trend: (i) => `Consider confirming current delivery capacity, given a reported headcount change of ${i.observedValue} for ${i.comparisonPeriod}.`,
  repeated_losses: (i) => `Consider requesting updated financial statements or references, given two consecutive reported years of negative operating result (${i.observedValue}).`,
  accounts_recency: (i) => `Consider requesting more recent financial statements, since the latest filed accounts on file are: ${i.observedValue}.`,
  governance_changes: (i) => `Consider asking about the reason for the recent change (${i.observedValue}) and whether it affects the ongoing relationship or point of contact.`,
};

const OPPORTUNITY_TEMPLATES: Record<string, Template> = {
  strong_financials: (i) => `This supplier shows strong reported performance (${i.observedValue} for ${i.comparisonPeriod}), which may support discussing extended commitments, volume terms, or an expanded scope of work.`,
};

// Information gaps worth actively asking the supplier about, even though
// they're never treated as evidence of weakness on their own.
const INFO_GAP_CATEGORIES = new Set(["dependency_risk"]);

function categoryFor(indicator: RiskIndicator): string {
  return indicator.title;
}

export function generateNegotiationGuidance(indicators: RiskIndicator[]): NegotiationSuggestion[] {
  const suggestions: NegotiationSuggestion[] = [];

  for (const indicator of indicators) {
    if ((indicator.status === "Attention" || indicator.status === "High attention") && CONCERN_TEMPLATES[indicator.key]) {
      suggestions.push({
        key: `guidance_${indicator.key}`,
        category: categoryFor(indicator),
        guidance: CONCERN_TEMPLATES[indicator.key](indicator),
        evidenceSummary: `${indicator.title}: ${indicator.observedValue} (${indicator.comparisonPeriod}) — ${indicator.source}.`,
        basedOnIndicatorKey: indicator.key,
      });
    } else if (indicator.status === "Positive" && OPPORTUNITY_TEMPLATES[indicator.key]) {
      suggestions.push({
        key: `guidance_${indicator.key}`,
        category: categoryFor(indicator),
        guidance: OPPORTUNITY_TEMPLATES[indicator.key](indicator),
        evidenceSummary: `${indicator.title}: ${indicator.observedValue} (${indicator.comparisonPeriod}) — ${indicator.source}.`,
        basedOnIndicatorKey: indicator.key,
      });
    } else if (indicator.isInformationGap && INFO_GAP_CATEGORIES.has(indicator.key)) {
      suggestions.push({
        key: `guidance_${indicator.key}`,
        category: categoryFor(indicator),
        guidance: `Consider asking the supplier directly about ${indicator.title.toLowerCase()}, since no connected data source currently reports this.`,
        evidenceSummary: `${indicator.title}: information gap — ${indicator.ruleUsed}`,
        basedOnIndicatorKey: indicator.key,
      });
    }
  }

  if (suggestions.length === 0) {
    return [
      {
        key: "guidance_none",
        category: "Overall",
        guidance: "No meaningful issue was identified from the data currently available.",
        evidenceSummary: "All checked indicators were Neutral or Positive at the time of the last check.",
        basedOnIndicatorKey: "none",
      },
    ];
  }

  return suggestions;
}
