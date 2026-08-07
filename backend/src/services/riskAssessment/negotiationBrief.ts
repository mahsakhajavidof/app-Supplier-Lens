import { iso } from "./indicatorTypes.js";
import type { RiskIndicator } from "./indicatorTypes.js";
import type { NegotiationSuggestion } from "./negotiationGuidance.js";

export interface NegotiationBriefInput {
  companyName: string;
  orgNr: string;
  country: string;
  category: string;
  ownerName?: string;
  lastCheckedAt: Date | string;
  indicators: RiskIndicator[];
  guidance: NegotiationSuggestion[];
}

/**
 * Assembles a deterministic, markdown negotiation/due-diligence brief from
 * already-computed indicators and guidance — no external AI call, no
 * randomness, same input always produces the same document.
 */
export function generateNegotiationBrief(input: NegotiationBriefInput): string {
  const lines: string[] = [];
  const generatedAt = iso(input.lastCheckedAt).slice(0, 10);

  lines.push("# Negotiation & due-diligence brief");
  lines.push("");
  lines.push(`**Supplier:** ${input.companyName} (${input.country} ${input.orgNr})`);
  lines.push(`**Category:** ${input.category}`);
  if (input.ownerName) lines.push(`**Internal responsible:** ${input.ownerName}`);
  lines.push(`**Generated:** ${generatedAt} (based on data as of the last check)`);
  lines.push("");
  lines.push(
    "_This brief is generated deterministically by Supplier Lens from reported data and locally-defined thresholds. " +
      "It is not an official rating and is not an automatic accept/reject decision. Figures are either shown as " +
      "reported by the source registry/provider or explicitly labeled as calculated by Supplier Lens._"
  );
  lines.push("");
  lines.push("## Risk indicators");
  for (const ind of input.indicators) {
    lines.push(`### ${ind.title} — ${ind.status}`);
    lines.push(`- Observed value: ${ind.observedValue} (${ind.comparisonPeriod})`);
    lines.push(`- Why it matters: ${ind.whyItMatters}`);
    lines.push(`- Source: ${ind.source}, retrieved ${ind.retrievedAt.slice(0, 10)}`);
    lines.push(`- Rule used: ${ind.ruleUsed}`);
    lines.push("");
  }
  lines.push("## Negotiation & due-diligence guidance");
  for (const g of input.guidance) {
    lines.push(`- **${g.category}:** ${g.guidance}`);
    lines.push(`  Evidence: ${g.evidenceSummary}`);
  }
  return lines.join("\n");
}
