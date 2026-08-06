import { CompanyRegistryProvider, NormalizedCompanyRecord } from "./types.js";
import { norwayProvider } from "./norway.js";
import { ukProvider } from "./uk.js";

// Add a new country by implementing CompanyRegistryProvider in its own file
// and listing it here. Nothing else in the app needs to change.
const PROVIDERS: CompanyRegistryProvider[] = [norwayProvider, ukProvider];

const byCountry = new Map(PROVIDERS.map((p) => [p.country, p]));

export function getProvider(country: string): CompanyRegistryProvider | undefined {
  return byCountry.get(country.toUpperCase());
}

export function listProviders() {
  return PROVIDERS.map((p) => ({
    country: p.country,
    registryName: p.registryName,
    configured: p.isConfigured(),
  }));
}

// Fields we compare between the last stored snapshot and a fresh lookup.
// Add a field here to start detecting changes in it.
const WATCHED_FIELDS: { key: keyof NormalizedCompanyRecord; label: string }[] = [
  { key: "name", label: "Registered name" },
  { key: "companyStatus", label: "Company status" },
  { key: "address", label: "Registered address" },
  { key: "employees", label: "Employees reported" },
  { key: "industryCode", label: "Industry code" },
  { key: "managingDirector", label: "Managing director" },
];

export interface DetectedChange {
  field: string;
  label: string;
  previousValue: string;
  currentValue: string;
}

/** Compare two normalized snapshots and return a human-readable list of what changed. */
export function diffSnapshots(
  previous: NormalizedCompanyRecord | null,
  current: NormalizedCompanyRecord
): DetectedChange[] {
  if (!previous) return [];
  const changes: DetectedChange[] = [];
  for (const { key, label } of WATCHED_FIELDS) {
    const prevVal = previous[key];
    const curVal = current[key];
    const prevStr = prevVal === undefined || prevVal === null ? "" : String(prevVal);
    const curStr = curVal === undefined || curVal === null ? "" : String(curVal);
    if (prevStr !== curStr && (prevStr || curStr)) {
      changes.push({
        field: key,
        label,
        previousValue: prevStr || "—",
        currentValue: curStr || "—",
      });
    }
  }
  return changes;
}
