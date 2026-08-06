import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { financialYears, people, registrySnapshots, subcontractors } from "../db/schema.js";
import type { NormalizedCompanyRecord } from "./registryProviders/types.js";

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

/** Store a registry result in every existing profile section it supports. */
export async function persistRegistryRecord(subcontractorId: string, record: NormalizedCompanyRecord) {
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

  await db.insert(registrySnapshots).values({
    subcontractorId,
    country: record.country,
    raw: JSON.stringify(record),
  });
}
