import type { CompanySearchResult, NormalizedCompanyRecord } from "./types.js";

export interface ApicvrCompany {
  vat: number;
  name: string;
  address?: string;
  zipcode?: number | string;
  city?: string;
  protected: boolean;
  phone?: string | null;
  startdate?: string;
  employees?: number | null;
  industrycode?: string;
  industrydesc?: string;
  companydesc?: string;
  companytypeshort?: string;
  status?: string;
  bankrupt?: boolean;
}

export interface ApicvrError {
  error: string;
}

// A malformed-but-well-formed-looking CVR (8 digits, doesn't exist) comes
// back as HTTP 200 with this body, not a 404 — verified against the live
// service. Every call site must check for this before treating a response
// as a real company.
export function isApicvrError(data: unknown): data is ApicvrError {
  return !!data && typeof data === "object" && typeof (data as ApicvrError).error === "string";
}

function formatAddress(c: ApicvrCompany): string | undefined {
  const cityLine = [c.zipcode, c.city].filter(Boolean).join(" ");
  return [c.address, cityLine].filter(Boolean).join(", ") || undefined;
}

// APICVR returns `vat` as a JSON number, which would silently drop a
// leading zero (e.g. 1234567 instead of "01234567"). Danish CVR numbers are
// always exactly 8 digits, so the zero-padded string is always recoverable.
export function cvrFromVat(vat: number): string {
  return String(vat).padStart(8, "0");
}

export function mapDenmarkRecord(company: ApicvrCompany): NormalizedCompanyRecord {
  return {
    orgNr: cvrFromVat(company.vat),
    country: "DK",
    name: company.name,
    legalForm: company.companydesc
      ? `${company.companydesc}${company.companytypeshort ? ` (${company.companytypeshort})` : ""}`
      : company.companytypeshort,
    companyStatus: company.status,
    registeredOn: company.startdate,
    industryCode: company.industrycode
      ? `${company.industrycode}${company.industrydesc ? ` ${company.industrydesc}` : ""}`
      : undefined,
    employees: company.employees ?? undefined,
    address: formatAddress(company),
    // Advertising-protection under Danish CVR law: APICVR's own terms ask
    // integrators not to surface contact details for opted-out companies.
    contactPhone: company.protected ? undefined : company.phone ?? undefined,
    raw: company,
  };
}

export function mapDenmarkSearchResult(company: ApicvrCompany): CompanySearchResult {
  return {
    orgNr: cvrFromVat(company.vat),
    name: company.name,
    legalForm: company.companytypeshort ?? company.companydesc,
    address: formatAddress(company),
  };
}
