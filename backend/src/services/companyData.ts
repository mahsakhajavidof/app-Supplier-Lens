import { RegistryProviderError } from "./registryProviders/types.js";
import type { NormalizedFinancialYear } from "./registryProviders/types.js";
import { mapFinancials, mapOwnership, mapManagement } from "./companyDataMapper.js";
import type { ManagementEntry, NormalizedOwnership } from "./companyDataMapper.js";
import { recordCompanyDataCall } from "./companyDataUsage.js";

// CompanyData.dk enrichment (financials/ownership/management) — backend
// only, server-side Bearer auth. Basic Danish company search/lookup (via
// APICVR) never depends on this being configured.
//
// NOTE ON THE BASE URL/PATHS: CompanyData.dk's full API reference requires
// a signed-in account to view, which wasn't available while building this
// (per this task's own instruction not to require the key to build/test the
// basic integration). The URL and paths below follow their documented
// Bearer-token convention and a typical REST shape for this kind of
// provider. Once a real key is available, verify these against the actual
// developer docs and adjust here if needed — this file is the only place
// that would need to change.
const BASE_URL = "https://api.companydata.dk/v1";

function apiKey(): string | undefined {
  return process.env.COMPANYDATA_DK_API_KEY?.trim() || undefined;
}

export function isConfigured(): boolean {
  return !!apiKey();
}

export interface CompanyDataStatus {
  country: "DK";
  basicLookupConfigured: true;
  financialEnrichmentConfigured: boolean;
}

/** Safe to return to the frontend/API — never touches the key's value. */
export function getCompanyDataStatus(): CompanyDataStatus {
  return { country: "DK", basicLookupConfigured: true, financialEnrichmentConfigured: isConfigured() };
}

async function callCompanyData<T>(path: string): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new RegistryProviderError("CompanyData.dk is not configured (missing API key)", 400);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
    });
  } catch (err) {
    throw new RegistryProviderError(
      `CompanyData.dk network error: ${err instanceof Error ? err.message : "unreachable"}`,
      500
    );
  }
  await recordCompanyDataCall();

  if (res.status === 401 || res.status === 403) {
    // Never include the key or any part of it in the message.
    throw new RegistryProviderError("CompanyData.dk rejected the configured API key", res.status);
  }
  if (res.status === 404) {
    throw new RegistryProviderError("No CompanyData.dk record available for this company", 404);
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    // No automatic retry loop — the caller simply doesn't get this data
    // until the next scheduled or manual check.
    throw new RegistryProviderError(
      `CompanyData.dk rate limit reached${retryAfter ? ` — retry after ${retryAfter}s` : ""}`,
      429
    );
  }
  if (!res.ok) {
    throw new RegistryProviderError(`CompanyData.dk request failed (${res.status})`, 502);
  }
  return (await res.json()) as T;
}

export interface FinancialsResult {
  financials: NormalizedFinancialYear[];
  raw: unknown;
}

export async function fetchFinancials(cvr: string): Promise<FinancialsResult> {
  const raw = await callCompanyData<unknown>(`/companies/${encodeURIComponent(cvr)}/financials`);
  return { financials: mapFinancials(raw), raw };
}

export interface OwnershipResult {
  ownership: NormalizedOwnership;
  raw: unknown;
}

export async function fetchOwnership(cvr: string): Promise<OwnershipResult> {
  const raw = await callCompanyData<unknown>(`/companies/${encodeURIComponent(cvr)}/ownership`);
  return { ownership: mapOwnership(raw), raw };
}

export interface ManagementResult {
  management: ManagementEntry[];
  raw: unknown;
}

export async function fetchManagement(cvr: string): Promise<ManagementResult> {
  const raw = await callCompanyData<unknown>(`/companies/${encodeURIComponent(cvr)}/management`);
  return { management: mapManagement(raw), raw };
}
