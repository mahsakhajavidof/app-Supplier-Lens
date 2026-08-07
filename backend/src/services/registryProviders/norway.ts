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
    if (!/^\d{9}$/.test(cleaned)) {
      throw new RegistryProviderError(
        `Norwegian organisation numbers must contain exactly 9 digits (got "${orgNr}")`,
        400
      );
    }
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(cleaned)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      throw new RegistryProviderError(`No entity found in Enhetsregisteret for org.nr ${orgNr}`, 404);
    }
    if (!res.ok) {
      throw new RegistryProviderError(`Enhetsregisteret lookup failed (${res.status})`, 502);
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
    // Org numbers may be typed with spaces (e.g. "923 609 016"); normalize
    // before deciding whether this is a number search or a name search.
    const normalizedNumber = q.replace(/\s+/g, "");
    const isNumeric = /^\d+$/.test(normalizedNumber);
    const params = new URLSearchParams({ size: isNumeric ? "8" : "100" });
    if (isNumeric) {
      if (normalizedNumber.length !== 9) return [];
      params.set("organisasjonsnummer", normalizedNumber);
    } else {
      params.set("navn", q);
      params.set("navnMetodeForSoek", "FORTLOEPENDE");
    }
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new RegistryProviderError(`Enhetsregisteret search failed (${res.status})`, res.status >= 500 ? 502 : res.status);
    }
    const data = (await res.json()) as { _embedded?: { enheter?: BrregEntity[] } };
    const entities = data._embedded?.enheter ?? [];
    const ranked = isNumeric ? entities : rankByRelevance(entities, q);
    return ranked.slice(0, 8).map((e) => ({
      orgNr: e.organisasjonsnummer,
      name: e.navn,
      legalForm: e.organisasjonsform?.beskrivelse,
      address: formatAddress(e.forretningsadresse),
    }));
  },
};

// Enhetsregisteret's name search returns matches in alphabetical order, not
// by relevance — searching "Equinor" buries "EQUINOR ASA" under 20+ unrelated
// subsidiaries (e.g. "EQUINOR ANGOLA BLOCK 1/14 AS") that sort earlier. Rank
// exact/prefix matches first, then shorter names, so the company the query
// actually names ends up at the top instead of off the end of an 8-item page.
function rankByRelevance(entities: BrregEntity[], query: string): BrregEntity[] {
  const q = query.toLowerCase();
  const tier = (name: string) => {
    const n = name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    return 2;
  };
  return [...entities].sort((a, b) => {
    const tierDiff = tier(a.navn) - tier(b.navn);
    return tierDiff !== 0 ? tierDiff : a.navn.length - b.navn.length;
  });
}
