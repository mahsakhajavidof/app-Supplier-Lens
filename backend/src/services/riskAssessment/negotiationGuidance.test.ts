import assert from "node:assert/strict";
import test from "node:test";
import { generateNegotiationGuidance } from "./negotiationGuidance.js";
import type { RiskIndicator } from "./indicatorTypes.js";

function indicator(overrides: Partial<RiskIndicator> = {}): RiskIndicator {
  return {
    key: "liquidity_ratio",
    title: "Liquidity",
    status: "Attention",
    observedValue: "1.0",
    comparisonPeriod: "FY2025",
    whyItMatters: "...",
    source: "Annual accounts / registry, as reported",
    retrievedAt: "2026-08-07T00:00:00.000Z",
    ruleUsed: "...",
    isInformationGap: false,
    ...overrides,
  };
}

const FORBIDDEN_WORDS = /fraud|insolvent|insolvency|illegal|criminal|discriminat|reject this supplier|terminate the contract|must not work with/i;

test("guidance is generated for an Attention/High attention indicator and references its evidence", () => {
  const [g] = generateNegotiationGuidance([indicator()]);
  assert.equal(g.basedOnIndicatorKey, "liquidity_ratio");
  assert.match(g.guidance, /1\.0/);
  assert.match(g.evidenceSummary, /Liquidity/);
});

test("guidance is generated for a Positive indicator, framed as an opportunity", () => {
  const [g] = generateNegotiationGuidance([indicator({ key: "strong_financials", title: "Strong financial performance", status: "Positive" })]);
  assert.match(g.guidance, /opportunit|extended commitments|volume/i);
});

test("an information-gap indicator worth surfacing generates guidance framed as a question, not an accusation", () => {
  const [g] = generateNegotiationGuidance([indicator({ key: "dependency_risk", title: "Customer / revenue dependency", status: "Neutral", isInformationGap: true })]);
  assert.match(g.guidance, /consider asking/i);
});

test("no meaningful issue is stated explicitly when every indicator is Neutral or Positive and not a surfaced information gap", () => {
  const guidance = generateNegotiationGuidance([indicator({ key: "equity_ratio", status: "Neutral", isInformationGap: false })]);
  assert.equal(guidance.length, 1);
  assert.match(guidance[0].guidance, /no meaningful issue/i);
});

test("no generated guidance text ever uses accusatory, legal, or discriminatory language", () => {
  const statuses: RiskIndicator["status"][] = ["Attention", "High attention", "Positive"];
  const keys = ["liquidity_ratio", "equity_ratio", "revenue_trend", "leverage", "headcount_trend", "repeated_losses", "accounts_recency", "governance_changes", "strong_financials"];
  for (const key of keys) {
    for (const status of statuses) {
      const [g] = generateNegotiationGuidance([indicator({ key, status })]);
      if (!g) continue;
      assert.doesNotMatch(g.guidance, FORBIDDEN_WORDS, `key=${key} status=${status}`);
    }
  }
});

test("every non-fallback suggestion carries a basedOnIndicatorKey tying it back to specific evidence", () => {
  const guidance = generateNegotiationGuidance([indicator({ key: "leverage", status: "High attention" }), indicator({ key: "governance_changes", title: "Ownership / management / auditor changes", status: "Attention" })]);
  assert.ok(guidance.every((g) => g.basedOnIndicatorKey && g.basedOnIndicatorKey !== "none"));
});
