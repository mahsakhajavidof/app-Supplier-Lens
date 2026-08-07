import { CompanyRegistryProvider, CompanySearchResult, NormalizedCompanyRecord, RegistryProviderError } from "./types.js";
import { ApicvrCompany, isApicvrError, mapDenmarkRecord, mapDenmarkSearchResult } from "./denmarkMapper.js";

// APICVR (apicvr.dk) is a free, open-source, keyless proxy over the Danish
// CVR register (Erhvervsstyrelsen). No credentials required — same "no key
// needed" shape as Norway's Enhetsregisteret provider. Financial and
// ownership enrichment for Denmark comes from CompanyData.dk separately
// (see services/companyData.ts); this provider only covers the free basic
// profile/search APICVR itself offers.
const BASE_URL = "http://apicvr.dk/api/v1";
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Supplier-Lens (https://github.com/mahsakhajavidof/app-Supplier-Lens)",
};

function normalizeCvr(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidCvr(cvr: string): boolean {
  return /^\d{8}$/.test(cvr);
}

export const denmarkProvider: CompanyRegistryProvider = {
  country: "DK",
  registryName: "Danish CVR via APICVR",

  isConfigured() {
    return true; // free, keyless public API
  },

  async lookup(orgNr: string): Promise<NormalizedCompanyRecord> {
    const cvr = normalizeCvr(orgNr);
    if (!isValidCvr(cvr)) {
      throw new RegistryProviderError(`Danish CVR numbers must contain exactly 8 digits (got "${orgNr}")`, 400);
    }
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(cvr)}`, { headers: HEADERS });
    if (!res.ok) {
      throw new RegistryProviderError(`APICVR lookup failed (${res.status})`, 502);
    }
    const data = (await res.json()) as ApicvrCompany | { error: string };
    if (isApicvrError(data)) {
      throw new RegistryProviderError(`No Danish company found for CVR ${cvr}`, 404);
    }
    return mapDenmarkRecord(data);
  },

  // As-you-type suggestions. A query that normalizes to exactly 8 digits is
  // treated as a CVR and resolved via the exact-lookup endpoint (never sent
  // to the name-search endpoint); anything else is a name search. Both
  // paths fail loudly on a genuine provider error — an outage must not look
  // like "no matches" (see registry.ts's shared error handling).
  async search(query: string): Promise<CompanySearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const isNumericQuery = /^\d+$/.test(q.replace(/\s+/g, ""));

    if (isNumericQuery) {
      const cvr = normalizeCvr(q);
      if (cvr.length !== 8) return []; // still typing a CVR number
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(cvr)}`, { headers: HEADERS });
      if (!res.ok) throw new RegistryProviderError(`APICVR search failed (${res.status})`, 502);
      const data = (await res.json()) as ApicvrCompany | { error: string };
      if (isApicvrError(data)) return [];
      return [mapDenmarkSearchResult(data)];
    }

    const res = await fetch(`${BASE_URL}/search/company/${encodeURIComponent(q)}?limit=50`, { headers: HEADERS });
    if (!res.ok) throw new RegistryProviderError(`APICVR search failed (${res.status})`, 502);
    const data = (await res.json()) as ApicvrCompany[] | { error: string };
    if (isApicvrError(data)) return [];
    return rankByRelevance(data, q).slice(0, 8).map(mapDenmarkSearchResult);
  },
};

// APICVR's name search doesn't rank by relevance — searching "Novo Nordisk"
// buries the actual pharma company (24256790) at position 27 of 30 under
// unrelated clubs/foundations that happen to share the name (e.g. "Novo
// Nordisk Kunstforening"). Fetch a larger page and rank exact/prefix matches
// first, same approach as Norway's search (see norway.ts's rankByRelevance).
function rankByRelevance(companies: ApicvrCompany[], query: string): ApicvrCompany[] {
  const q = query.toLowerCase();
  const tier = (name: string) => {
    const n = name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    return 2;
  };
  return [...companies].sort((a, b) => {
    const tierDiff = tier(a.name) - tier(b.name);
    return tierDiff !== 0 ? tierDiff : a.name.length - b.name.length;
  });
}
