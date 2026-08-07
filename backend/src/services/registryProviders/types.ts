/**
 * Every country's company registry looks different on the wire. Each
 * provider below is responsible for translating its country's API response
 * into this one normalized shape, so the rest of the app (diffing, display,
 * storage) never has to know which country it is looking at.
 *
 * To add a new country: implement `CompanyRegistryProvider` in a new file
 * in this folder, then register it in `index.ts`.
 */
export interface NormalizedCompanyRecord {
  orgNr: string;
  country: string; // ISO 3166-1 alpha-2
  name: string;
  legalForm?: string;
  companyStatus?: string;
  registeredOn?: string;
  industryCode?: string;
  employees?: number;
  municipality?: string;
  vatRegistered?: boolean;
  address?: string;
  postalAddress?: string;
  managingDirector?: string;
  auditor?: string;
  shareCapital?: string;
  contactPhone?: string;
  financials?: NormalizedFinancialYear[];
  people?: NormalizedPerson[];
  raw: unknown; // the untouched provider response, kept for audit/debugging
}

export interface NormalizedFinancialYear {
  year: number;
  currency?: string;
  operatingRevenue?: number;
  operatingResult?: number;
  resultBeforeTax?: number;
  equityRatio?: number;
  liquidityRatio?: number;
  employees?: number;
}

export interface NormalizedPerson {
  name: string;
  role: string;
  since?: string;
}

/** A single suggestion returned while the user is still typing — enough to
 * show in a dropdown and to run a full lookup() once picked. */
export interface CompanySearchResult {
  orgNr: string;
  name: string;
  legalForm?: string;
  address?: string;
}

export interface CompanyRegistryProvider {
  /** ISO 3166-1 alpha-2 country code this provider serves, e.g. "NO". */
  readonly country: string;
  /** Human-readable name of the underlying registry, for UI/labels. */
  readonly registryName: string;
  /** True if this provider is ready to call (has any required API key). */
  isConfigured(): boolean;
  /** Fetch and normalize the current record for a given org/company number. */
  lookup(orgNr: string): Promise<NormalizedCompanyRecord>;
  /** As-you-type suggestions by company name or (partial) org number. */
  search(query: string): Promise<CompanySearchResult[]>;
}

// `status` is the HTTP status the API route should respond with (e.g. 400 for
// a missing key, 401 for a rejected one, 404 for no match, 502 for an
// unreachable/erroring registry) — so callers can distinguish failure modes
// instead of reporting every registry error the same way.
export class RegistryProviderError extends Error {
  constructor(message: string, readonly status: number = 502) {
    super(message);
    this.name = "RegistryProviderError";
  }
}
