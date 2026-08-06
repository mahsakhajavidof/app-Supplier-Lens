import { CompanyRegistryProvider, CompanySearchResult, NormalizedCompanyRecord, RegistryProviderError } from "./types.js";

// Companies House REST API. Free, but requires an API key you generate
// yourself at https://developer.company-information.service.gov.uk/
// (Sign in → "Manage applications" → create a "Live" key). Set it as
// COMPANIES_HOUSE_API_KEY in backend/.env — until then this provider reports
// itself as unconfigured and the app will skip it rather than fail noisily.
const BASE_URL = "https://api.company-information.service.gov.uk";

interface CompaniesHouseSearchItem {
  company_number: string;
  title: string;
  company_type?: string;
  address_snippet?: string;
}

interface CompaniesHouseProfile {
  company_number: string;
  company_name: string;
  company_status?: string;
  type?: string;
  date_of_creation?: string;
  sic_codes?: string[];
  registered_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
  };
}

function apiKey(): string | undefined {
  return process.env.COMPANIES_HOUSE_API_KEY?.trim() || undefined;
}

function formatAddress(a?: CompaniesHouseProfile["registered_office_address"]): string | undefined {
  if (!a) return undefined;
  return [a.address_line_1, a.address_line_2, a.locality, a.postal_code].filter(Boolean).join(", ") || undefined;
}

export const ukProvider: CompanyRegistryProvider = {
  country: "GB",
  registryName: "Companies House",

  isConfigured() {
    return !!apiKey();
  },

  async lookup(orgNr: string): Promise<NormalizedCompanyRecord> {
    const key = apiKey();
    if (!key) {
      throw new RegistryProviderError(
        "Companies House is not configured. Set COMPANIES_HOUSE_API_KEY in backend/.env — get a free key at " +
          "https://developer.company-information.service.gov.uk/"
      );
    }
    const cleaned = orgNr.replace(/\s+/g, "");
    const res = await fetch(`${BASE_URL}/company/${encodeURIComponent(cleaned)}`, {
      headers: {
        Accept: "application/json",
        // Companies House uses HTTP Basic auth with the key as the username and an empty password.
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      },
    });
    if (res.status === 404) {
      throw new RegistryProviderError(`No company found in Companies House for number ${orgNr}`);
    }
    if (!res.ok) {
      throw new RegistryProviderError(`Companies House lookup failed (${res.status})`);
    }
    const data = (await res.json()) as CompaniesHouseProfile;

    return {
      orgNr: data.company_number,
      country: "GB",
      name: data.company_name,
      legalForm: data.type,
      companyStatus: data.company_status,
      registeredOn: data.date_of_creation,
      industryCode: data.sic_codes?.[0],
      address: formatAddress(data.registered_office_address),
      raw: data,
    };
  },

  // Companies House has a dedicated free-text search endpoint (distinct from
  // the profile lookup above) that matches on name or company number as you
  // type, so partial input works here unlike the exact-match /company/:number.
  async search(query: string): Promise<CompanySearchResult[]> {
    const key = apiKey();
    const q = query.trim();
    if (!key || !q) return [];
    const res = await fetch(`${BASE_URL}/search/companies?q=${encodeURIComponent(q)}&items_per_page=8`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: CompaniesHouseSearchItem[] };
    return (data.items ?? []).map((item) => ({
      orgNr: item.company_number,
      name: item.title,
      legalForm: item.company_type,
      address: item.address_snippet,
    }));
  },
};
