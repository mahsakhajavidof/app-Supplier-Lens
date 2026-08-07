import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { events, subcontractors } from "../db/schema.js";
import { denmarkProvider } from "./registryProviders/denmark.js";
import { diffSnapshots } from "./registryProviders/index.js";
import { persistRegistryRecord } from "./registryPersistence.js";
import { RegistryProviderError } from "./registryProviders/types.js";
import type { NormalizedCompanyRecord } from "./registryProviders/types.js";
import { getLatestSnapshot, logCheckResult, readSnapshotNormalized } from "./registrySnapshotStore.js";
import { runCompanyDataEnrichment } from "./denmarkEnrichment.js";

const PROVIDER = "APICVR";
const DATA_TYPE = "basic_profile";
const CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// Denmark also watches legal form and registration date — NO/GB's shared
// diffSnapshots() call keeps watching only its original six fields.
const DK_EXTRA_FIELDS = [
  { key: "legalForm" as const, label: "Legal form" },
  { key: "registeredOn" as const, label: "Registration date" },
];

type EventRow = typeof events.$inferSelect;

export interface DanishCheckResult {
  profile: NormalizedCompanyRecord;
  createdEvents: EventRow[];
}

/**
 * The one Danish-supplier check routine — APICVR basic profile (required)
 * plus CompanyData enrichment (if configured, best-effort). Used identically
 * by the manual "Sync with Danish registry" action and the weekly monitor,
 * so both compare snapshots the same way. Not used by "Add subcontractor",
 * which already has a fresh APICVR lookup from populating the form and
 * would otherwise fetch it twice.
 */
export async function checkDanishSupplier(subcontractorId: string): Promise<DanishCheckResult> {
  const sub = await db.query.subcontractors.findFirst({ where: eq(subcontractors.id, subcontractorId) });
  if (!sub) throw new RegistryProviderError("Subcontractor not found", 404);

  await db.update(subcontractors).set({ lastCheckAttemptedAt: new Date() }).where(eq(subcontractors.id, sub.id));

  const previousSnapshot = await getLatestSnapshot(sub.id, PROVIDER, DATA_TYPE);
  const previous = previousSnapshot ? readSnapshotNormalized<NormalizedCompanyRecord>(previousSnapshot) : null;

  let profile: NormalizedCompanyRecord;
  try {
    profile = await denmarkProvider.lookup(sub.orgNr);
  } catch (err) {
    await logCheckResult({
      subcontractorId: sub.id,
      provider: PROVIDER,
      dataType: DATA_TYPE,
      success: false,
      statusCode: err instanceof RegistryProviderError ? err.status : undefined,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }

  await persistRegistryRecord(sub.id, profile, { provider: PROVIDER, dataType: DATA_TYPE });
  await logCheckResult({ subcontractorId: sub.id, provider: PROVIDER, dataType: DATA_TYPE, success: true });
  await db
    .update(subcontractors)
    .set({ lastCheckedAt: new Date(), nextCheckAt: new Date(Date.now() + CHECK_INTERVAL_MS) })
    .where(eq(subcontractors.id, sub.id));

  const createdEvents: EventRow[] = [];
  const basicChanges = diffSnapshots(previous, profile, DK_EXTRA_FIELDS);
  for (const c of basicChanges) {
    const [row] = await db
      .insert(events)
      .values({
        subcontractorId: sub.id,
        type: `${c.label} changed`,
        description: `${c.label} changed from "${c.previousValue}" to "${c.currentValue}", detected via ${denmarkProvider.registryName}.`,
        attention: "CHANGE_DETECTED",
        followUp: "UNRESOLVED",
        source: denmarkProvider.registryName,
        previousValue: c.previousValue,
        currentValue: c.currentValue,
      })
      .returning();
    createdEvents.push(row);
  }

  createdEvents.push(...(await runCompanyDataEnrichment(sub.id, "DK", sub.orgNr)));

  return { profile, createdEvents };
}
