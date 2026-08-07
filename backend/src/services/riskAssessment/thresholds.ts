// Every threshold a risk indicator uses lives here, in one place, so the
// rules driving "Attention"/"High attention" statuses are easy to find,
// review, and adjust — none of this is Companydata.dk's proprietary scoring
// or any other external rating; it's Supplier Lens's own, documented,
// adjustable judgment applied to reported figures.
export const THRESHOLDS = {
  // Current/liquidity ratio (current assets / current liabilities), as reported.
  liquidityRatio: { highAttention: 0.8, attention: 1.2 },
  // Equity ratio (equity / total assets), as reported. Negative means
  // liabilities exceed assets outright, handled as its own indicator.
  equityRatio: { highAttention: 0.1, attention: 0.2 },
  // Year-over-year revenue growth, percent. Calculated by Supplier Lens.
  revenueGrowth: { highAttention: -20, attention: -10, positive: 10 },
  // Operating margin, percent. Calculated by Supplier Lens.
  operatingMargin: { highAttention: -5, attention: 0, positive: 8 },
  // Implied leverage (liabilities / assets). Calculated by Supplier Lens.
  impliedLeverage: { highAttention: 0.85, attention: 0.75 },
  // Year-over-year headcount decline, percent. Calculated by Supplier Lens.
  headcountChange: { attention: -15 },
  // How many full calendar years may pass since the latest reported
  // financial period before accounts are considered outdated.
  accountsAgeYears: { attention: 2, highAttention: 3 },
  // How many months back to look for ownership/management/auditor change
  // events when flagging governance changes.
  governanceChangeLookbackMonths: 12,
} as const;
