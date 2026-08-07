import assert from "node:assert/strict";
import test from "node:test";
import {
  accountsRecencyIndicator,
  equityIndicator,
  headcountTrendIndicator,
  leverageIndicator,
  liquidityIndicator,
  repeatedLossesIndicator,
  revenueTrendIndicator,
  strongFinancialsIndicator,
} from "./indicators.js";
import { dependencyRiskIndicator, governanceChangeIndicator } from "./indicatorsQualitative.js";
import type { RiskAssessmentInput } from "./indicatorTypes.js";

function year(overrides: Record<string, unknown> = {}) {
  return { year: 2025, currency: "NOK", operatingRevenue: 100, operatingResult: 10, resultBeforeTax: 8, equityRatio: 0.4, liquidityRatio: 1.5, employees: 50, ...overrides };
}

function input(overrides: Partial<RiskAssessmentInput> = {}): RiskAssessmentInput {
  return { financials: [year()], governanceChangeEvents: [], lastCheckedAt: new Date("2026-08-07T00:00:00Z"), ...overrides };
}

test("liquidityIndicator flags High attention below the high-attention threshold", () => {
  const ind = liquidityIndicator(input({ financials: [year({ liquidityRatio: 0.5 })] }));
  assert.equal(ind.status, "High attention");
  assert.equal(ind.isInformationGap, false);
});

test("liquidityIndicator flags Attention between the two thresholds", () => {
  const ind = liquidityIndicator(input({ financials: [year({ liquidityRatio: 1.0 })] }));
  assert.equal(ind.status, "Attention");
});

test("liquidityIndicator is Neutral above the attention threshold", () => {
  const ind = liquidityIndicator(input({ financials: [year({ liquidityRatio: 2.0 })] }));
  assert.equal(ind.status, "Neutral");
});

test("liquidityIndicator is an information gap, not a warning, when no liquidity ratio is reported", () => {
  const ind = liquidityIndicator(input({ financials: [] }));
  assert.equal(ind.status, "Neutral");
  assert.equal(ind.isInformationGap, true);
});

test("equityIndicator flags High attention for a negative equity ratio", () => {
  const ind = equityIndicator(input({ financials: [year({ equityRatio: -0.05 })] }));
  assert.equal(ind.status, "High attention");
  assert.match(ind.observedValue, /negative equity/);
});

test("revenueTrendIndicator flags High attention for a sharp decline", () => {
  const ind = revenueTrendIndicator(input({ financials: [year({ year: 2024, operatingRevenue: 100 }), year({ year: 2025, operatingRevenue: 70 })] }));
  assert.equal(ind.status, "High attention");
});

test("revenueTrendIndicator flags Positive for strong growth", () => {
  const ind = revenueTrendIndicator(input({ financials: [year({ year: 2024, operatingRevenue: 100 }), year({ year: 2025, operatingRevenue: 130 })] }));
  assert.equal(ind.status, "Positive");
});

test("leverageIndicator flags Attention above the leverage threshold", () => {
  const ind = leverageIndicator(input({ financials: [year({ equityRatio: 0.2 })] })); // leverage = 0.8
  assert.equal(ind.status, "Attention");
});

test("headcountTrendIndicator flags Attention for a sharp headcount decline", () => {
  const ind = headcountTrendIndicator(input({ financials: [year({ year: 2024, employees: 100 }), year({ year: 2025, employees: 80 })] }));
  assert.equal(ind.status, "Attention");
});

test("repeatedLossesIndicator flags High attention only when both of the two most recent years are negative", () => {
  const bothNegative = repeatedLossesIndicator(input({ financials: [year({ year: 2024, operatingResult: -5 }), year({ year: 2025, operatingResult: -3 })] }));
  assert.equal(bothNegative.status, "High attention");

  const oneNegative = repeatedLossesIndicator(input({ financials: [year({ year: 2024, operatingResult: 5 }), year({ year: 2025, operatingResult: -3 })] }));
  assert.equal(oneNegative.status, "Neutral");
});

test("accountsRecencyIndicator flags Attention/High attention based on the age of the latest filed accounts", () => {
  const fresh = accountsRecencyIndicator(input({ financials: [year({ year: 2026 })], lastCheckedAt: new Date("2026-08-07") }));
  assert.equal(fresh.status, "Neutral");
  const stale = accountsRecencyIndicator(input({ financials: [year({ year: 2022 })], lastCheckedAt: new Date("2026-08-07") }));
  assert.equal(stale.status, "High attention");
});

test("governanceChangeIndicator flags Attention when a governance event fell within the lookback window", () => {
  const ind = governanceChangeIndicator(
    input({ governanceChangeEvents: [{ type: "Auditor changed", detectedAt: new Date("2026-06-01") }], lastCheckedAt: new Date("2026-08-07") })
  );
  assert.equal(ind.status, "Attention");
});

test("governanceChangeIndicator ignores a change outside the lookback window", () => {
  const ind = governanceChangeIndicator(
    input({ governanceChangeEvents: [{ type: "Auditor changed", detectedAt: new Date("2020-01-01") }], lastCheckedAt: new Date("2026-08-07") })
  );
  assert.equal(ind.status, "Neutral");
});

test("dependencyRiskIndicator is always an explicit information gap, never evidence of weakness", () => {
  const ind = dependencyRiskIndicator(input());
  assert.equal(ind.status, "Neutral");
  assert.equal(ind.isInformationGap, true);
});

test("strongFinancialsIndicator is Positive only when both growth and margin clear their thresholds", () => {
  const strong = strongFinancialsIndicator(input({ financials: [year({ year: 2024, operatingRevenue: 100, operatingResult: 10 }), year({ year: 2025, operatingRevenue: 115, operatingResult: 12 })] }));
  assert.equal(strong.status, "Positive");
  const notStrong = strongFinancialsIndicator(input({ financials: [year({ year: 2024, operatingRevenue: 100, operatingResult: 1 }), year({ year: 2025, operatingRevenue: 101, operatingResult: 1 })] }));
  assert.equal(notStrong.status, "Neutral");
});
