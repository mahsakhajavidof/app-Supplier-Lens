import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { events, financialYears, ownerships, people } from "../db/schema.js";
import * as companyData from "./companyData.js";
import { RegistryProviderError } from "./registryProviders/types.js";
import type { NormalizedFinancialYear } from "./registryProviders/types.js";
import type { ManagementEntry, NormalizedOwnership } from "./companyDataMapper.js";
import { getLatestSnapshot, logCheckResult, readSnapshotNormalized, saveSnapshot } from "./registrySnapshotStore.js";

const PROVIDER = "CompanyData.dk";
type EventRow = typeof events.$inferSelect;

async function createChangeEvent(subcontractorId: string, type: string, previousValue: string, currentValue: string): Promise<EventRow> {
  const [row] = await db
    .insert(events)
    .values({
      subcontractorId,
      type,
      description: `${type}, detected via ${PROVIDER}.`,
      attention: "CHANGE_DETECTED",
      followUp: "UNRESOLVED",
      source: PROVIDER,
      previousValue,
      currentValue,
    })
    .returning();
  return row;
}

// Shared fetch → snapshot → apply-to-display → diff → event pipeline for one
// CompanyData data type. A failure here (missing key, 401/403/404/429,
// network error) is logged as an operational result and swallowed — it must
// never block the other two data types or the APICVR basic profile.
async function enrichDataType<T>(params: {
  subcontractorId: string;
  country: string;
  dataType: string;
  fetch: () => Promise<T>;
  diff: (previous: T, current: T) => { type: string; previousValue: string; currentValue: string }[];
  apply: (data: T) => Promise<void>;
}): Promise<EventRow[]> {
  try {
    const data = await params.fetch();
    const previousSnapshot = await getLatestSnapshot(params.subcontractorId, PROVIDER, params.dataType);
    const previous = previousSnapshot ? readSnapshotNormalized<T>(previousSnapshot) : null;

    await saveSnapshot({
      subcontractorId: params.subcontractorId,
      country: params.country,
      provider: PROVIDER,
      dataType: params.dataType,
      normalized: data,
    });
    await logCheckResult({ subcontractorId: params.subcontractorId, provider: PROVIDER, dataType: params.dataType, success: true });
    await params.apply(data);

    if (!previous) return []; // first response is the baseline — no false events
    const changes = params.diff(previous, data);
    const rows: EventRow[] = [];
    for (const c of changes) rows.push(await createChangeEvent(params.subcontractorId, c.type, c.previousValue, c.currentValue));
    return rows;
  } catch (err) {
    await logCheckResult({
      subcontractorId: params.subcontractorId,
      provider: PROVIDER,
      dataType: params.dataType,
      success: false,
      statusCode: err instanceof RegistryProviderError ? err.status : undefined,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return [];
  }
}

function diffFinancials(previous: NormalizedFinancialYear[], current: NormalizedFinancialYear[]) {
  const changes: { type: string; previousValue: string; currentValue: string }[] = [];
  for (const year of current) {
    const prevYear = previous.find((p) => p.year === year.year);
    if (!prevYear) {
      changes.push({ type: `Financial period ${year.year} filed`, previousValue: "—", currentValue: String(year.year) });
    } else if (prevYear.operatingRevenue !== year.operatingRevenue || prevYear.operatingResult !== year.operatingResult) {
      changes.push({
        type: `Financial figures changed for ${year.year}`,
        previousValue: `Revenue ${prevYear.operatingRevenue ?? "—"}, result ${prevYear.operatingResult ?? "—"}`,
        currentValue: `Revenue ${year.operatingRevenue ?? "—"}, result ${year.operatingResult ?? "—"}`,
      });
    }
  }
  return changes;
}

function ownerLabel(o: { name: string; sharePercent?: number; shareRange?: string }): string {
  return `${o.name}${o.sharePercent != null ? ` (${o.sharePercent}%)` : o.shareRange ? ` (${o.shareRange})` : ""}`;
}

function diffOwnership(previous: NormalizedOwnership, current: NormalizedOwnership) {
  const prevLabel = previous.owners.map(ownerLabel).sort().join(", ") || "—";
  const currLabel = current.owners.map(ownerLabel).sort().join(", ") || "—";
  return prevLabel === currLabel ? [] : [{ type: "Ownership changed", previousValue: prevLabel, currentValue: currLabel }];
}

function diffManagement(previous: ManagementEntry[], current: ManagementEntry[]) {
  const prevLabel = previous.map((m) => `${m.name} (${m.role})`).sort().join(", ") || "—";
  const currLabel = current.map((m) => `${m.name} (${m.role})`).sort().join(", ") || "—";
  return prevLabel === currLabel ? [] : [{ type: "Management changed", previousValue: prevLabel, currentValue: currLabel }];
}

async function applyFinancials(subcontractorId: string, financials: NormalizedFinancialYear[]) {
  await db.delete(financialYears).where(eq(financialYears.subcontractorId, subcontractorId));
  if (financials.length) await db.insert(financialYears).values(financials.map((f) => ({ ...f, subcontractorId })));
}

async function applyOwnership(subcontractorId: string, ownership: NormalizedOwnership) {
  await db.delete(ownerships).where(eq(ownerships.subcontractorId, subcontractorId));
  // Only entries with an exact, provider-disclosed percentage go into the
  // display table — a range like "25-50%" is never turned into a number.
  const exact = ownership.owners.filter((o) => o.sharePercent !== undefined);
  if (exact.length) await db.insert(ownerships).values(exact.map((o) => ({ name: o.name, sharePercent: o.sharePercent!, subcontractorId })));
}

async function applyManagement(subcontractorId: string, management: ManagementEntry[]) {
  await db.delete(people).where(eq(people.subcontractorId, subcontractorId));
  if (management.length) await db.insert(people).values(management.map((m) => ({ ...m, subcontractorId })));
}

/** Runs financials/ownership/management enrichment if CompanyData is
 * configured; a no-op returning [] otherwise. Each data type is fully
 * independent — one failing never affects the others. */
export async function runCompanyDataEnrichment(subcontractorId: string, country: string, cvr: string): Promise<EventRow[]> {
  if (!companyData.isConfigured()) return [];
  const base = { subcontractorId, country };
  const results = await Promise.all([
    enrichDataType({
      ...base,
      dataType: "financials",
      fetch: async () => (await companyData.fetchFinancials(cvr)).financials,
      diff: diffFinancials,
      apply: (d) => applyFinancials(subcontractorId, d),
    }),
    enrichDataType({
      ...base,
      dataType: "ownership",
      fetch: async () => (await companyData.fetchOwnership(cvr)).ownership,
      diff: diffOwnership,
      apply: (d) => applyOwnership(subcontractorId, d),
    }),
    enrichDataType({
      ...base,
      dataType: "management",
      fetch: async () => (await companyData.fetchManagement(cvr)).management,
      diff: diffManagement,
      apply: (d) => applyManagement(subcontractorId, d),
    }),
  ]);
  return results.flat();
}
