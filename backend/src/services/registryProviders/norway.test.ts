import assert from "node:assert/strict";
import test from "node:test";
import { norwayProvider } from "./norway.js";

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
