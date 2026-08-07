import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { events, financialYears, people, registrySnapshots, subcontractors } from "../db/schema.js";
import { diffSnapshots } from "./registryProviders/index.js";
import type { CompanyRegistryProvider, NormalizedCompanyRecord } from "./registryProviders/types.js";
import { saveSnapshot } from "./registrySnapshotStore.js";
import { runCompanyDataEnrichment } from "./denmarkEnrichment.js";

const DK_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function profileValues(record: NormalizedCompanyRecord) {
  return {
    company: record.name,
    legalForm: record.legalForm,
    companyStatus: record.companyStatus ?? "Registered and active",
    registeredOn: record.registeredOn,
    industryCode: record.industryCode,
    employees: record.employees,
    municipality: record.municipality,
    vatRegistered: record.vatRegistered ?? false,
    auditor: record.auditor,
    shareCapital: record.shareCapital,
    address: record.address,
    postalAddress: record.postalAddress,
    contactPhone: record.contactPhone,
  };
}

/**
 * Store a registry result in every existing profile section it supports.
 * `meta` tags the resulting snapshot with a provider/data type — used by
 * Denmark to keep its APICVR basic-profile snapshots distinct from
 * CompanyData's financials/ownership ones. NO/GB omit it, exactly as
 * before, so their snapshots are untagged just like every existing row.
 */
export async function persistRegistryRecord(
  subcontractorId: string,
  record: NormalizedCompanyRecord,
  meta?: { provider: string; dataType: string }
) {
  await db.update(subcontractors).set(profileValues(record)).where(eq(subcontractors.id, subcontractorId));

  if (record.financials) {
    await db.delete(financialYears).where(eq(financialYears.subcontractorId, subcontractorId));
    if (record.financials.length) {
      await db.insert(financialYears).values(record.financials.map((year) => ({ ...year, subcontractorId })));
    }
  }

  if (record.people) {
    await db.delete(people).where(eq(people.subcontractorId, subcontractorId));
    if (record.people.length) {
      await db.insert(people).values(record.people.map((person) => ({ ...person, subcontractorId })));
    }
  }

  await saveSnapshot({
    subcontractorId,
    country: record.country,
    provider: meta?.provider,
    dataType: meta?.dataType,
    normalized: record,
  });
}

/**
 * Persists a freshly-fetched registry record for a newly-created
 * subcontractor. For Denmark, this also tags the snapshot, triggers
 * CompanyData enrichment (using the profile already fetched — never a
 * second APICVR call), and sets the next weekly-check time. NO/GB are
 * unaffected — they still just call the plain persistRegistryRecord path.
 */
export async function persistInitialRegistryData(
  subcontractorId: string,
  country: string,
  orgNr: string,
  record: NormalizedCompanyRecord
) {
  if (country !== "DK") {
    await persistRegistryRecord(subcontractorId, record);
    return;
  }
  await persistRegistryRecord(subcontractorId, record, { provider: "APICVR", dataType: "basic_profile" });
  await runCompanyDataEnrichment(subcontractorId, "DK", orgNr);
  await db
    .update(subcontractors)
    .set({ lastCheckedAt: new Date(), nextCheckAt: new Date(Date.now() + DK_CHECK_INTERVAL_MS) })
    .where(eq(subcontractors.id, subcontractorId));
}

/**
 * The existing NO/GB "Sync" behavior, unchanged — moved out of the route
 * handler so Denmark's own sync path could be added there without pushing
 * that file over the line-count limit. Re-fetches the provider's record,
 * diffs it against the last snapshot, creates an Event per changed field,
 * and persists the new snapshot.
 */
export async function syncGenericRegistry(sub: typeof subcontractors.$inferSelect, provider: CompanyRegistryProvider) {
  const current = await provider.lookup(sub.orgNr);

  const lastSnapshot = await db.query.registrySnapshots.findFirst({
    where: eq(registrySnapshots.subcontractorId, sub.id),
    orderBy: [desc(registrySnapshots.fetchedAt)],
  });
  const previous = lastSnapshot ? (JSON.parse(lastSnapshot.raw) as NormalizedCompanyRecord) : null;
  const changes = diffSnapshots(previous, current);

  await persistRegistryRecord(sub.id, current);

  const createdEvents: (typeof events.$inferSelect)[] = [];
  for (const c of changes) {
    const [created] = await db
      .insert(events)
      .values({
        subcontractorId: sub.id,
        type: `${c.label} changed`,
        description: `${c.label} changed from "${c.previousValue}" to "${c.currentValue}", detected via ${provider.registryName}.`,
        attention: "CHANGE_DETECTED",
        followUp: "UNRESOLVED",
        source: provider.registryName,
        previousValue: c.previousValue,
        currentValue: c.currentValue,
      })
      .returning();
    createdEvents.push(created);
  }

  await db.update(subcontractors).set({ lastCheckedAt: new Date() }).where(eq(subcontractors.id, sub.id));

  return { registry: provider.registryName, changesDetected: createdEvents.length, createdEvents };
}
