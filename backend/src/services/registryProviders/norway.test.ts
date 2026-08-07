import assert from "node:assert/strict";
import test from "node:test";
import { norwayProvider } from "./norway.js";
import { RegistryProviderError } from "./types.js";

test("Norway lookup enriches a company with roles, auditor, capital and accounts", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/roller")) {
      return Response.json({
        rollegrupper: [
          {
            type: { kode: "DAGL" },
            sistEndret: "2026-01-15",
            roller: [{ type: { beskrivelse: "Daglig leder" }, person: { navn: { fornavn: "Ada", etternavn: "Nord" } } }],
          },
          {
            type: { kode: "REVI" },
            roller: [{ type: { beskrivelse: "Revisor" }, enhet: { navn: ["REVISJON AS"] } }],
          },
        ],
      });
    }
    if (url.includes("regnskapsregisteret")) {
      return Response.json([{
        regnskapsperiode: { tilDato: "2025-12-31" },
        valuta: "NOK",
        resultatregnskapResultat: {
          ordinaertResultatFoerSkattekostnad: 8_000_000,
          driftsresultat: { driftsresultat: 10_000_000, driftsinntekter: { sumDriftsinntekter: 100_000_000 } },
        },
        egenkapitalGjeld: {
          sumEgenkapitalGjeld: 80_000_000,
          egenkapital: { sumEgenkapital: 40_000_000 },
          gjeldOversikt: { kortsiktigGjeld: { sumKortsiktigGjeld: 20_000_000 } },
        },
        eiendeler: { sumEiendeler: 80_000_000, omloepsmidler: { sumOmloepsmidler: 30_000_000 } },
      }]);
    }
    return Response.json({
      organisasjonsnummer: "123456789",
      navn: "TESTBEDRIFT AS",
      organisasjonsform: { kode: "AS", beskrivelse: "Aksjeselskap" },
      antallAnsatte: 12,
      telefon: "12 34 56 78",
      registrertIMvaregisteret: true,
      kapital: { belop: 500_000, valuta: "NOK" },
      forretningsadresse: { adresse: ["Testveien 1"], postnummer: "0001", poststed: "OSLO", kommune: "OSLO" },
    });
  };

  try {
    const company = await norwayProvider.lookup("123 456 789");
    assert.equal(requested.length, 3);
    assert.equal(company.name, "TESTBEDRIFT AS");
    assert.equal(company.managingDirector, "Ada Nord");
    assert.equal(company.auditor, "REVISJON AS");
    assert.equal(company.shareCapital, "NOK 500,000");
    assert.equal(company.contactPhone, "12 34 56 78");
    assert.deepEqual(company.people, [{ name: "Ada Nord", role: "Daglig leder", since: "2026-01-15" }]);
    assert.deepEqual(company.financials, [{
      year: 2025,
      currency: "NOK",
      operatingRevenue: 100,
      operatingResult: 10,
      resultBeforeTax: 8,
      equityRatio: 0.5,
      liquidityRatio: 1.5,
      employees: 12,
    }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway lookup normalizes an organisation number containing spaces", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/roller")) return Response.json({});
    if (url.includes("regnskapsregisteret")) return Response.json([]);
    return Response.json({ organisasjonsnummer: "923609016", navn: "EQUINOR ASA" });
  };
  try {
    const company = await norwayProvider.lookup("923 609 016");
    assert.equal(company.orgNr, "923609016");
    assert.ok(requested[0].endsWith("/enheter/923609016"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway lookup rejects an organisation number that isn't exactly 9 digits", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };
  try {
    await assert.rejects(
      () => norwayProvider.lookup("12345"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 400
    );
    assert.equal(called, false, "an invalid org number should never reach the network");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway lookup distinguishes no-match (404) from a registry outage (500)", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(
      () => norwayProvider.lookup("923609016"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 404
    );

    globalThis.fetch = async () => new Response(null, { status: 500 });
    await assert.rejects(
      () => norwayProvider.lookup("923609016"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 502
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway lookup propagates a network failure instead of swallowing it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("ENOTFOUND data.brreg.no");
  };
  try {
    await assert.rejects(() => norwayProvider.lookup("923609016"), /ENOTFOUND/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
