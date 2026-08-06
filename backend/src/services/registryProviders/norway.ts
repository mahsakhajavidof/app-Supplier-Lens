import { CompanyRegistryProvider, CompanySearchResult, NormalizedCompanyRecord, RegistryProviderError } from "./types.js";
import { BrregAccount, BrregEntity, BrregRoles, formatAddress, mapNorwayRecord } from "./norwayMapper.js";

// Brønnøysundregistrene's "Enhetsregisteret" (Central Coordinating Register
// for Legal Entities) is a free, public, keyless API. This is a real, live
// integration — no credentials required.
// Docs: https://data.brreg.no/enhetsregisteret/api/docs/index.html
const BASE_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const ACCOUNTS_URL = "https://data.brreg.no/regnskapsregisteret/regnskap";

async function optionalJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new RegistryProviderError(`Brønnøysund enrichment failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const norwayProvider: CompanyRegistryProvider = {
  country: "NO",
  registryName: "Brønnøysundregistrene (Enhetsregisteret)",

  isConfigured() {
    return true; // public API, nothing to configure
  },

  async lookup(orgNr: string): Promise<NormalizedCompanyRecord> {
    const cleaned = orgNr.replace(/\s+/g, "");
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(cleaned)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      throw new RegistryProviderError(`No entity found in Enhetsregisteret for org.nr ${orgNr}`);
    }
    if (!res.ok) {
      throw new RegistryProviderError(`Enhetsregisteret lookup failed (${res.status})`);
    }
    const entity = (await res.json()) as BrregEntity;
    const [roles, accounts] = await Promise.all([
      optionalJson<BrregRoles>(`${BASE_URL}/${encodeURIComponent(cleaned)}/roller`),
      optionalJson<BrregAccount[]>(`${ACCOUNTS_URL}/${encodeURIComponent(cleaned)}`),
    ]);
    return mapNorwayRecord(entity, roles, accounts);
  },

  // As-you-type suggestions. Enhetsregisteret's `navn` param does a
  // fuzzy/fortloepende (prefix+substring) search server-side; `organisasjonsnummer`
  // only matches exact, complete 9-digit numbers (no partial/prefix search), so a
  // partial number just returns no results here rather than erroring.
  async search(query: string): Promise<CompanySearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const isNumeric = /^\d+$/.test(q);
    const params = new URLSearchParams({ size: "8" });
    if (isNumeric) {
      if (q.length !== 9) return [];
      params.set("organisasjonsnummer", q);
    } else {
      params.set("navn", q);
      params.set("navnMetodeForSoek", "FORTLOEPENDE");
    }
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { _embedded?: { enheter?: BrregEntity[] } };
    return (data._embedded?.enheter ?? []).map((e) => ({
      orgNr: e.organisasjonsnummer,
      name: e.navn,
      legalForm: e.organisasjonsform?.beskrivelse,
      address: formatAddress(e.forretningsadresse),
    }));
  },
};
