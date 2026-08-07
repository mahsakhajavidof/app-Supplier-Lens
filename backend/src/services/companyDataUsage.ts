import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { companyDataUsage } from "../db/schema.js";

// CompanyData.dk's Basic plan allows 500 calls/month. Tracked locally (one
// row per calendar month) so the app can warn before that's likely to be
// exceeded — this is an estimate for the operator, not enforced by the
// provider itself.
export const MONTHLY_QUOTA = 500;
const WARNING_THRESHOLD = 0.9;

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Increments this month's call counter and returns the new count. Uses a
 * single atomic upsert rather than a separate read-then-write — financials,
 * ownership and management enrichment call this concurrently
 * (denmarkEnrichment.ts's Promise.all), so a check-then-insert would race on
 * the first call of a new month and throw on `month`'s unique constraint.
 */
export async function recordCompanyDataCall(): Promise<number> {
  const month = currentMonth();
  const [row] = await db
    .insert(companyDataUsage)
    .values({ month, callCount: 1 })
    .onConflictDoUpdate({ target: companyDataUsage.month, set: { callCount: sql`${companyDataUsage.callCount} + 1` } })
    .returning();
  return row.callCount;
}

export interface UsageStatus {
  month: string;
  callCount: number;
  quota: number;
  nearingQuota: boolean;
}

export async function getCompanyDataUsage(): Promise<UsageStatus> {
  const month = currentMonth();
  const existing = await db.query.companyDataUsage.findFirst({ where: eq(companyDataUsage.month, month) });
  const callCount = existing?.callCount ?? 0;
  return { month, callCount, quota: MONTHLY_QUOTA, nearingQuota: callCount >= MONTHLY_QUOTA * WARNING_THRESHOLD };
}
