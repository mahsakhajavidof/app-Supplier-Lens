import type { NormalizedCompanyRecord, NormalizedFinancialYear, NormalizedPerson } from "./types.js";

interface Address {
  adresse?: string[];
  postnummer?: string;
  poststed?: string;
  kommune?: string;
}

export interface BrregEntity {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode: string; beskrivelse: string };
  registreringsdatoEnhetsregisteret?: string;
  naeringskode1?: { kode: string; beskrivelse: string };
  antallAnsatte?: number;
  forretningsadresse?: Address;
  postadresse?: Address;
  registrertIMvaregisteret?: boolean;
  konkurs?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;
  telefon?: string;
  kapital?: { belop?: number; valuta?: string };
}

interface RoleEntry {
  type?: { kode?: string; beskrivelse?: string };
  person?: { navn?: { fornavn?: string; mellomnavn?: string; etternavn?: string } };
  enhet?: { navn?: string[] };
  avregistrert?: boolean;
}

export interface BrregRoles {
  rollegrupper?: Array<{
    type?: { kode?: string };
    sistEndret?: string;
    roller?: RoleEntry[];
  }>;
}

export interface BrregAccount {
  regnskapsperiode?: { tilDato?: string };
  valuta?: string;
  egenkapitalGjeld?: {
    sumEgenkapitalGjeld?: number;
    egenkapital?: { sumEgenkapital?: number };
    gjeldOversikt?: { kortsiktigGjeld?: { sumKortsiktigGjeld?: number } };
  };
  eiendeler?: {
    sumEiendeler?: number;
    omloepsmidler?: { sumOmloepsmidler?: number };
  };
  resultatregnskapResultat?: {
    ordinaertResultatFoerSkattekostnad?: number;
    driftsresultat?: {
      driftsresultat?: number;
      driftsinntekter?: { sumDriftsinntekter?: number };
    };
  };
}

export function formatAddress(address?: Address): string | undefined {
  if (!address) return undefined;
  const street = (address.adresse ?? []).join(" ");
  const city = [address.postnummer, address.poststed].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ") || undefined;
}

function roleName(role: RoleEntry): string | undefined {
  if (role.person?.navn) {
    const { fornavn, mellomnavn, etternavn } = role.person.navn;
    return [fornavn, mellomnavn, etternavn].filter(Boolean).join(" ") || undefined;
  }
  return role.enhet?.navn?.join(" ");
}

function activeRoles(roles: BrregRoles | null): Array<RoleEntry & { groupCode?: string; changed?: string }> {
  return (roles?.rollegrupper ?? []).flatMap((group) =>
    (group.roller ?? [])
      .filter((role) => !role.avregistrert)
      .map((role) => ({ ...role, groupCode: group.type?.kode, changed: group.sistEndret }))
  );
}

export function mapPeople(roles: BrregRoles | null): NormalizedPerson[] {
  return activeRoles(roles).flatMap((role) => {
    if (!role.person || !roleName(role) || !role.type?.beskrivelse) return [];
    return [{ name: roleName(role)!, role: role.type.beskrivelse, since: role.changed }];
  });
}

function ratio(numerator?: number, denominator?: number): number | undefined {
  return numerator != null && denominator ? numerator / denominator : undefined;
}

function inMillions(value?: number): number | undefined {
  return value == null ? undefined : value / 1_000_000;
}

export function mapFinancials(accounts: BrregAccount[] | null, employees?: number): NormalizedFinancialYear[] {
  return (accounts ?? []).flatMap((account) => {
    const endDate = account.regnskapsperiode?.tilDato;
    if (!endDate) return [];
    const result = account.resultatregnskapResultat;
    const balance = account.egenkapitalGjeld;
    const assets = account.eiendeler;
    return [{
      year: Number(endDate.slice(0, 4)),
      currency: account.valuta,
      operatingRevenue: inMillions(result?.driftsresultat?.driftsinntekter?.sumDriftsinntekter),
      operatingResult: inMillions(result?.driftsresultat?.driftsresultat),
      resultBeforeTax: inMillions(result?.ordinaertResultatFoerSkattekostnad),
      equityRatio: ratio(balance?.egenkapital?.sumEgenkapital, assets?.sumEiendeler ?? balance?.sumEgenkapitalGjeld),
      liquidityRatio: ratio(assets?.omloepsmidler?.sumOmloepsmidler, balance?.gjeldOversikt?.kortsiktigGjeld?.sumKortsiktigGjeld),
      employees,
    }];
  });
}

function companyStatus(entity: BrregEntity): string {
  if (entity.konkurs) return "Bankrupt";
  if (entity.underTvangsavviklingEllerTvangsopplosning) return "Under compulsory liquidation";
  if (entity.underAvvikling) return "Under liquidation";
  return "Registered and active";
}

export function mapNorwayRecord(
  entity: BrregEntity,
  roles: BrregRoles | null,
  accounts: BrregAccount[] | null
): NormalizedCompanyRecord {
  const active = activeRoles(roles);
  const managingDirector = active.find((role) => role.groupCode === "DAGL");
  const auditor = active.find((role) => role.groupCode === "REVI");
  const capital = entity.kapital;
  return {
    orgNr: entity.organisasjonsnummer,
    country: "NO",
    name: entity.navn,
    legalForm: entity.organisasjonsform
      ? `${entity.organisasjonsform.beskrivelse} (${entity.organisasjonsform.kode})`
      : undefined,
    companyStatus: companyStatus(entity),
    registeredOn: entity.registreringsdatoEnhetsregisteret,
    industryCode: entity.naeringskode1 ? `${entity.naeringskode1.kode} ${entity.naeringskode1.beskrivelse}` : undefined,
    employees: entity.antallAnsatte,
    municipality: entity.forretningsadresse?.kommune,
    vatRegistered: entity.registrertIMvaregisteret,
    address: formatAddress(entity.forretningsadresse),
    postalAddress: formatAddress(entity.postadresse),
    contactPhone: entity.telefon,
    shareCapital: capital?.belop != null ? `${capital.valuta ?? "NOK"} ${capital.belop.toLocaleString("en-US")}` : undefined,
    managingDirector: managingDirector ? roleName(managingDirector) : undefined,
    auditor: auditor ? roleName(auditor) : undefined,
    people: mapPeople(roles),
    financials: mapFinancials(accounts, entity.antallAnsatte),
    raw: { entity, roles, accounts },
  };
}
