import assert from "node:assert/strict";
import test from "node:test";
import { norwayProvider } from "./norway.js";
import { RegistryProviderError } from "./types.js";

function entity(orgNr: string, navn: string) {
  return { organisasjonsnummer: orgNr, navn };
}

test("Norway search ranks the company the query names above alphabetically-earlier subsidiaries", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      _embedded: {
        enheter: [
          entity("886995512", "BEDRIFTSKUNSTFORENINGEN EQUINOR NORD-ROGALAND"),
          entity("993888621", "EQUINOR - SENIORKLUBB HARSTAD"),
          entity("985619433", "EQUINOR ALGERIA AS"),
          entity("923609016", "EQUINOR ASA"),
          entity("981363876", "EQUINOR ASSET MANAGEMENT AS"),
        ],
      },
    });
  try {
    const results = await norwayProvider.search("Equinor");
    assert.equal(results[0].orgNr, "923609016");
    assert.equal(results[0].name, "EQUINOR ASA");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway search normalizes a spaced organisation number before querying", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json({ _embedded: { enheter: [entity("923609016", "EQUINOR ASA")] } });
  };
  try {
    const results = await norwayProvider.search("923 609 016");
    assert.equal(results.length, 1);
    const url = new URL(requested[0]);
    assert.equal(url.searchParams.get("organisasjonsnummer"), "923609016");
    assert.equal(url.searchParams.get("navn"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway search passes Norwegian characters through to the registry query", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json({ _embedded: { enheter: [entity("999999999", "MØLLER OG SØNN ÅS")] } });
  };
  try {
    const results = await norwayProvider.search("Møller Ås");
    assert.equal(results[0].name, "MØLLER OG SØNN ÅS");
    const url = new URL(requested[0]);
    assert.equal(url.searchParams.get("navn"), "Møller Ås");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway search returns an empty list for a genuine no-match", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ _embedded: { enheter: [] } });
  try {
    const results = await norwayProvider.search("Xyzzyunlikelycompanyname");
    assert.deepEqual(results, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway search distinguishes a registry outage from an empty result", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });
  try {
    await assert.rejects(
      () => norwayProvider.search("Equinor"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 502
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Norway search propagates a network failure instead of swallowing it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network unreachable");
  };
  try {
    await assert.rejects(() => norwayProvider.search("Equinor"), /network unreachable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
