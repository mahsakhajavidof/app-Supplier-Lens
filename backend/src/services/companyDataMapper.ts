import type { NormalizedFinancialYear } from "./registryProviders/types.js";

// CompanyData.dk's full field-level API reference is behind their signup —
// unavailable while implementing this without a key (per this task's own
// "do not require the key to complete or test the basic integration"
// instruction). These mappers accept a few plausible field-name variants
// for a Danish financial-data provider and are the one place to correct
// against the real response shape once a key is available for live testing.

interface RawFinancialPeriod {
  year?: number;
  periodEnd?: string;
  currency?: string;
  revenue?: number;
  netRevenue?: number;
  turnover?: number;
  result?: number;
  profitLoss?: number;
  resultBeforeTax?: number;
  equityRatio?: number;
  liquidityRatio?: number;
  employees?: number;
}

export function mapFinancials(raw: unknown): NormalizedFinancialYear[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawFinancialPeriod[]).flatMap((p) => {
    const year = p.year ?? (p.periodEnd ? Number(p.periodEnd.slice(0, 4)) : undefined);
    if (!year) return [];
    return [
      {
        year,
        currency: p.currency,
        operatingRevenue: p.revenue ?? p.netRevenue ?? p.turnover,
        operatingResult: p.result ?? p.profitLoss,
        resultBeforeTax: p.resultBeforeTax,
        equityRatio: p.equityRatio,
        liquidityRatio: p.liquidityRatio,
        employees: p.employees,
      },
    ];
  });
}

export interface OwnershipEntry {
  name: string;
  sharePercent?: number; // only set when the source discloses an exact figure
  shareRange?: string; // e.g. "25-50%", when only an interval is disclosed
}

export interface NormalizedOwnership {
  owners: OwnershipEntry[];
  beneficialOwnersAvailable: boolean;
}

interface RawOwner {
  name?: string;
  ownerName?: string;
  percentage?: number;
  sharePercent?: number;
  shareRange?: string;
  percentageRange?: string;
}

export function mapOwnership(raw: unknown): NormalizedOwnership {
  if (!raw || typeof raw !== "object") return { owners: [], beneficialOwnersAvailable: false };
  const body = raw as { owners?: RawOwner[]; beneficialOwnersAvailable?: boolean };
  const owners = (body.owners ?? []).flatMap((o) => {
    const name = o.name ?? o.ownerName;
    if (!name) return [];
    return [
      {
        name,
        sharePercent: o.percentage ?? o.sharePercent,
        shareRange: o.shareRange ?? o.percentageRange,
      },
    ];
  });
  return { owners, beneficialOwnersAvailable: body.beneficialOwnersAvailable ?? owners.length > 0 };
}

export interface ManagementEntry {
  name: string;
  role: string;
  since?: string;
}

interface RawManagementEntry {
  name?: string;
  title?: string;
  role?: string;
  since?: string;
  appointedDate?: string;
}

export function mapManagement(raw: unknown): ManagementEntry[] {
  const list = Array.isArray(raw) ? raw : (raw as { management?: RawManagementEntry[] })?.management ?? [];
  return (list as RawManagementEntry[]).flatMap((m) => {
    if (!m.name) return [];
    return [{ name: m.name, role: m.title ?? m.role ?? "Management", since: m.since ?? m.appointedDate }];
  });
}
