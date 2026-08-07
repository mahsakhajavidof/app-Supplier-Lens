import { THRESHOLDS } from "./thresholds.js";
import { headcountChange, impliedLeverage, operatingMargin, revenueGrowth } from "./financialMetrics.js";
import { CALCULATED_SOURCE, informationGap, iso, latestYear, REPORTED_SOURCE } from "./indicatorTypes.js";
import type { IndicatorStatus, RiskAssessmentInput, RiskIndicator } from "./indicatorTypes.js";
import { dependencyRiskIndicator, governanceChangeIndicator } from "./indicatorsQualitative.js";

export type { IndicatorStatus, RiskIndicator, RiskAssessmentInput } from "./indicatorTypes.js";

export function liquidityIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const year = latestYear(input.financials);
  const rule = `Attention below ${THRESHOLDS.liquidityRatio.attention}, High attention below ${THRESHOLDS.liquidityRatio.highAttention}.`;
  const why = "A low liquidity ratio can signal difficulty meeting short-term obligations.";
  if (!year || year.liquidityRatio == null) return informationGap("liquidity_ratio", "Liquidity", why, rule, retrievedAt);
  const r = year.liquidityRatio;
  const status: IndicatorStatus = r < THRESHOLDS.liquidityRatio.highAttention ? "High attention" : r < THRESHOLDS.liquidityRatio.attention ? "Attention" : "Neutral";
  return { key: "liquidity_ratio", title: "Liquidity", status, observedValue: r.toFixed(2), comparisonPeriod: `FY${year.year}`, whyItMatters: why, source: REPORTED_SOURCE, retrievedAt, ruleUsed: rule, isInformationGap: false };
}

export function equityIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const year = latestYear(input.financials);
  const rule = `Attention below ${THRESHOLDS.equityRatio.attention}, High attention below ${THRESHOLDS.equityRatio.highAttention} or negative.`;
  const why = "A very low or negative equity ratio means liabilities approach or exceed total assets.";
  if (!year || year.equityRatio == null) return informationGap("equity_ratio", "Equity position", why, rule, retrievedAt);
  const r = year.equityRatio;
  const status: IndicatorStatus = r < 0 || r < THRESHOLDS.equityRatio.highAttention ? "High attention" : r < THRESHOLDS.equityRatio.attention ? "Attention" : "Neutral";
  return {
    key: "equity_ratio",
    title: "Equity position",
    status,
    observedValue: r < 0 ? `${(r * 100).toFixed(0)}% (negative equity)` : `${(r * 100).toFixed(0)}%`,
    comparisonPeriod: `FY${year.year}`,
    whyItMatters: why,
    source: REPORTED_SOURCE,
    retrievedAt,
    ruleUsed: rule,
    isInformationGap: false,
  };
}

export function revenueTrendIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const m = revenueGrowth(input.financials);
  const rule = `Attention below ${THRESHOLDS.revenueGrowth.attention}%, High attention below ${THRESHOLDS.revenueGrowth.highAttention}%, Positive above ${THRESHOLDS.revenueGrowth.positive}%.`;
  const why = "A declining revenue trend can signal a weakening business; strong growth can signal a growing one.";
  if (!m.calculable) return { ...informationGap("revenue_trend", "Revenue trend", why, rule, retrievedAt), observedValue: m.reason ?? "Not available" };
  const v = m.value!;
  const status: IndicatorStatus =
    v <= THRESHOLDS.revenueGrowth.highAttention ? "High attention" : v <= THRESHOLDS.revenueGrowth.attention ? "Attention" : v >= THRESHOLDS.revenueGrowth.positive ? "Positive" : "Neutral";
  return { key: "revenue_trend", title: "Revenue trend", status, observedValue: `${v.toFixed(1)}%`, comparisonPeriod: m.periodLabel, whyItMatters: why, source: CALCULATED_SOURCE, retrievedAt, ruleUsed: rule, isInformationGap: false };
}

export function leverageIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const m = impliedLeverage(input.financials);
  const rule = `Attention above ${THRESHOLDS.impliedLeverage.attention}, High attention above ${THRESHOLDS.impliedLeverage.highAttention}.`;
  const why = "High leverage increases sensitivity to interest rates and refinancing risk.";
  if (!m.calculable) return { ...informationGap("leverage", "Leverage", why, rule, retrievedAt), observedValue: m.reason ?? "Not available" };
  const v = m.value!;
  const status: IndicatorStatus = v > THRESHOLDS.impliedLeverage.highAttention ? "High attention" : v > THRESHOLDS.impliedLeverage.attention ? "Attention" : "Neutral";
  return { key: "leverage", title: "Leverage", status, observedValue: v.toFixed(2), comparisonPeriod: m.periodLabel, whyItMatters: why, source: CALCULATED_SOURCE, retrievedAt, ruleUsed: rule, isInformationGap: false };
}

export function headcountTrendIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const m = headcountChange(input.financials);
  const rule = `Attention below ${THRESHOLDS.headcountChange.attention}%.`;
  const why = "A sharp headcount decline can signal reduced capacity to deliver.";
  if (!m.calculable) return { ...informationGap("headcount_trend", "Headcount trend", why, rule, retrievedAt), observedValue: m.reason ?? "Not available" };
  const v = m.value!;
  const status: IndicatorStatus = v <= THRESHOLDS.headcountChange.attention ? "Attention" : "Neutral";
  return { key: "headcount_trend", title: "Headcount trend", status, observedValue: `${v.toFixed(1)}%`, comparisonPeriod: m.periodLabel, whyItMatters: why, source: CALCULATED_SOURCE, retrievedAt, ruleUsed: rule, isInformationGap: false };
}

/** Two or more consecutive reported years with a negative operating result. */
export function repeatedLossesIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const rule = "High attention when the two most recent reported years both show a negative operating result.";
  const why = "Consecutive losses erode equity and cash reserves over time.";
  const sorted = [...input.financials].sort((a, b) => b.year - a.year).slice(0, 2);
  if (sorted.length < 2 || sorted.some((y) => y.operatingResult == null)) {
    return { ...informationGap("repeated_losses", "Repeated losses", why, rule, retrievedAt), observedValue: "Fewer than two years of operating result on file." };
  }
  const bothNegative = sorted.every((y) => y.operatingResult! < 0);
  return {
    key: "repeated_losses",
    title: "Repeated losses",
    status: bothNegative ? "High attention" : "Neutral",
    observedValue: sorted.map((y) => `FY${y.year}: ${y.operatingResult}`).join(", "),
    comparisonPeriod: `FY${sorted[1].year}–FY${sorted[0].year}`,
    whyItMatters: why,
    source: REPORTED_SOURCE,
    retrievedAt,
    ruleUsed: rule,
    isInformationGap: false,
  };
}

export function accountsRecencyIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const rule = `Attention when the latest filed accounts are ${THRESHOLDS.accountsAgeYears.attention}+ years old, High attention at ${THRESHOLDS.accountsAgeYears.highAttention}+ years.`;
  const why = "Outdated accounts limit how current this financial assessment can be.";
  const year = latestYear(input.financials);
  if (!year) return informationGap("accounts_recency", "Accounts recency", why, rule, retrievedAt);
  const age = new Date(retrievedAt).getFullYear() - year.year;
  const status: IndicatorStatus = age >= THRESHOLDS.accountsAgeYears.highAttention ? "High attention" : age >= THRESHOLDS.accountsAgeYears.attention ? "Attention" : "Neutral";
  return {
    key: "accounts_recency",
    title: "Accounts recency",
    status,
    observedValue: `Latest filed accounts: FY${year.year} (${age} year(s) old)`,
    comparisonPeriod: `As of ${retrievedAt.slice(0, 10)}`,
    whyItMatters: why,
    source: REPORTED_SOURCE,
    retrievedAt,
    ruleUsed: rule,
    isInformationGap: false,
  };
}

export function strongFinancialsIndicator(input: RiskAssessmentInput): RiskIndicator {
  const retrievedAt = iso(input.lastCheckedAt);
  const growth = revenueGrowth(input.financials);
  const margin = operatingMargin(input.financials);
  const rule = `Positive when revenue growth is above ${THRESHOLDS.revenueGrowth.positive}% and operating margin is above ${THRESHOLDS.operatingMargin.positive}%.`;
  const strong = growth.calculable && margin.calculable && growth.value! >= THRESHOLDS.revenueGrowth.positive && margin.value! >= THRESHOLDS.operatingMargin.positive;
  return {
    key: "strong_financials",
    title: "Strong financial performance",
    status: strong ? "Positive" : "Neutral",
    observedValue: growth.calculable && margin.calculable ? `Revenue ${growth.value!.toFixed(1)}%, margin ${margin.value!.toFixed(1)}%` : "Not enough data to assess",
    comparisonPeriod: growth.periodLabel,
    whyItMatters: "Sustained growth with healthy margins can support a stronger commercial position in negotiation.",
    source: CALCULATED_SOURCE,
    retrievedAt,
    ruleUsed: rule,
    isInformationGap: !growth.calculable || !margin.calculable,
  };
}

export function evaluateRiskIndicators(input: RiskAssessmentInput): RiskIndicator[] {
  return [
    liquidityIndicator(input),
    equityIndicator(input),
    revenueTrendIndicator(input),
    leverageIndicator(input),
    headcountTrendIndicator(input),
    repeatedLossesIndicator(input),
    accountsRecencyIndicator(input),
    governanceChangeIndicator(input),
    dependencyRiskIndicator(input),
    strongFinancialsIndicator(input),
  ];
}
