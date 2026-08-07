import type { NormalizedFinancialYear } from "../registryProviders/types.js";

// Every metric here is DERIVED by Supplier Lens from reported figures — it is
// never itself a figure a registry or CompanyData.dk reported directly (those
// stay labeled "as reported" wherever they're shown). Each metric returns
// `calculable: false` with a `reason` instead of guessing whenever an input
// is missing, a denominator is zero, or the two periods being compared use
// different reporting currencies — never silently producing a misleading
// number from incompatible data.
export interface CalculatedMetric {
  key: string;
  label: string;
  value: number | null;
  unit: "percent" | "ratio";
  calculable: boolean;
  reason?: string;
  periodLabel: string;
  calculatedBySupplierLens: true;
}

function metric(
  key: string,
  label: string,
  unit: CalculatedMetric["unit"],
  periodLabel: string,
  value: number | null,
  reason?: string
): CalculatedMetric {
  return { key, label, value, unit, calculable: value !== null, reason, periodLabel, calculatedBySupplierLens: true };
}

function latestTwo(years: NormalizedFinancialYear[]): [NormalizedFinancialYear | undefined, NormalizedFinancialYear | undefined] {
  const sorted = [...years].sort((a, b) => b.year - a.year);
  return [sorted[0], sorted[1]];
}

/** Year-over-year revenue growth. Requires two periods in the same currency. */
export function revenueGrowth(years: NormalizedFinancialYear[]): CalculatedMetric {
  const [latest, prior] = latestTwo(years);
  const key = "revenue_growth";
  const label = "Revenue growth";
  if (!latest || !prior) return metric(key, label, "percent", "—", null, "Fewer than two reported financial periods available.");
  const period = `FY${latest.year} vs FY${prior.year}`;
  if (latest.operatingRevenue == null || prior.operatingRevenue == null) {
    return metric(key, label, "percent", period, null, "Operating revenue not reported for one or both periods.");
  }
  if (latest.currency && prior.currency && latest.currency !== prior.currency) {
    return metric(key, label, "percent", period, null, `Reporting currency changed between periods (${prior.currency} → ${latest.currency}).`);
  }
  if (prior.operatingRevenue === 0) return metric(key, label, "percent", period, null, "Prior-period revenue is zero.");
  return metric(key, label, "percent", period, ((latest.operatingRevenue - prior.operatingRevenue) / prior.operatingRevenue) * 100);
}

/** Operating result as a percentage of operating revenue, for the latest reported period. */
export function operatingMargin(years: NormalizedFinancialYear[]): CalculatedMetric {
  const [latest] = latestTwo(years);
  const key = "operating_margin";
  const label = "Operating margin";
  if (!latest) return metric(key, label, "percent", "—", null, "No reported financial period available.");
  const period = `FY${latest.year}`;
  if (latest.operatingRevenue == null || latest.operatingResult == null) {
    return metric(key, label, "percent", period, null, "Operating revenue or operating result not reported.");
  }
  if (latest.operatingRevenue === 0) return metric(key, label, "percent", period, null, "Reported revenue is zero.");
  return metric(key, label, "percent", period, (latest.operatingResult / latest.operatingRevenue) * 100);
}

/** Result before tax as a percentage of operating revenue, for the latest reported period. */
export function resultBeforeTaxMargin(years: NormalizedFinancialYear[]): CalculatedMetric {
  const [latest] = latestTwo(years);
  const key = "result_before_tax_margin";
  const label = "Result-before-tax margin";
  if (!latest) return metric(key, label, "percent", "—", null, "No reported financial period available.");
  const period = `FY${latest.year}`;
  if (latest.operatingRevenue == null || latest.resultBeforeTax == null) {
    return metric(key, label, "percent", period, null, "Operating revenue or result before tax not reported.");
  }
  if (latest.operatingRevenue === 0) return metric(key, label, "percent", period, null, "Reported revenue is zero.");
  return metric(key, label, "percent", period, (latest.resultBeforeTax / latest.operatingRevenue) * 100);
}

/** Year-over-year headcount change. */
export function headcountChange(years: NormalizedFinancialYear[]): CalculatedMetric {
  const [latest, prior] = latestTwo(years);
  const key = "headcount_change";
  const label = "Headcount change";
  if (!latest || !prior) return metric(key, label, "percent", "—", null, "Fewer than two reported financial periods available.");
  const period = `FY${latest.year} vs FY${prior.year}`;
  if (latest.employees == null || prior.employees == null) {
    return metric(key, label, "percent", period, null, "Employee count not reported for one or both periods.");
  }
  if (prior.employees === 0) return metric(key, label, "percent", period, null, "Prior-period headcount is zero.");
  return metric(key, label, "percent", period, ((latest.employees - prior.employees) / prior.employees) * 100);
}

/**
 * Implied leverage (liabilities as a share of total assets), derived from
 * the reported equity ratio: assets = equity + liabilities, so
 * liabilities/assets = 1 − equity/assets. Uses only the already-reported
 * equity ratio — no separate liabilities figure is stored.
 */
export function impliedLeverage(years: NormalizedFinancialYear[]): CalculatedMetric {
  const [latest] = latestTwo(years);
  const key = "implied_leverage";
  const label = "Implied leverage (liabilities / assets)";
  if (!latest) return metric(key, label, "ratio", "—", null, "No reported financial period available.");
  const period = `FY${latest.year}`;
  if (latest.equityRatio == null) return metric(key, label, "ratio", period, null, "Equity ratio not reported.");
  return metric(key, label, "ratio", period, 1 - latest.equityRatio);
}

export function computeFinancialMetrics(years: NormalizedFinancialYear[]): CalculatedMetric[] {
  return [revenueGrowth(years), operatingMargin(years), resultBeforeTaxMargin(years), headcountChange(years), impliedLeverage(years)];
}
