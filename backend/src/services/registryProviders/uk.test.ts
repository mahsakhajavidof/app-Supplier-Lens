import assert from "node:assert/strict";
import test from "node:test";
import { ukProvider } from "./uk.js";
import { RegistryProviderError } from "./types.js";

// Runs `fn` with COMPANIES_HOUSE_API_KEY temporarily set (or removed, for
// `key === undefined`), restoring the original value afterwards.
async function withApiKey<T>(key: string | undefined, fn: () => Promise<T>): Promise<T> {
  const original = process.env.COMPANIES_HOUSE_API_KEY;
  if (key === undefined) delete process.env.COMPANIES_HOUSE_API_KEY;
  else process.env.COMPANIES_HOUSE_API_KEY = key;
  try {
    return await fn();
  } finally {
    if (original === undefined) delete process.env.COMPANIES_HOUSE_API_KEY;
    else process.env.COMPANIES_HOUSE_API_KEY = original;
  }
}

const TESCO_PROFILE = {
  company_number: "00445790",
  company_name: "TESCO PLC",
  company_status: "active",
  type: "plc",
  date_of_creation: "1947-11-27",
  sic_codes: ["47110"],
  registered_office_address: { address_line_1: "Tesco House", locality: "Welwyn Garden City", postal_code: "AL7 1GA" },
};

test("UK search returns a real match for a company name", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({ items: [{ company_number: "00445790", title: "TESCO PLC", company_type: "plc" }] });
  try {
    const results = await withApiKey("test-key", () => ukProvider.search("Tesco"));
    assert.equal(results[0].orgNr, "00445790");
    assert.equal(results[0].name, "TESCO PLC");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("UK lookup of 00445790 returns TESCO PLC and preserves the leading zeroes", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json(TESCO_PROFILE);
  };
  try {
    const company = await withApiKey("test-key", () => ukProvider.lookup("00445790"));
    assert.equal(company.orgNr, "00445790");
    assert.equal(company.name, "TESCO PLC");
    assert.ok(requested[0].includes("/company/00445790"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("UK lookup and search both fail clearly when the API key is missing", async () => {
  await withApiKey(undefined, async () => {
    assert.equal(ukProvider.isConfigured(), false);
    await assert.rejects(
      () => ukProvider.lookup("00445790"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 400
    );
    await assert.rejects(
      () => ukProvider.search("Tesco"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 400
    );
  });
});

test("UK lookup and search treat a 401 as a rejected key, distinct from not-found", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 401 });
  try {
    await withApiKey("bad-key", async () => {
      await assert.rejects(
        () => ukProvider.lookup("00445790"),
        (err: unknown) => err instanceof RegistryProviderError && err.status === 401
      );
      await assert.rejects(
        () => ukProvider.search("Tesco"),
        (err: unknown) => err instanceof RegistryProviderError && err.status === 401
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("UK lookup distinguishes company-not-found (404) from a registry outage (500)", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await withApiKey("test-key", () =>
      assert.rejects(
        () => ukProvider.lookup("00000000"),
        (err: unknown) => err instanceof RegistryProviderError && err.status === 404
      )
    );

    globalThis.fetch = async () => new Response(null, { status: 500 });
    await withApiKey("test-key", () =>
      assert.rejects(
        () => ukProvider.lookup("00445790"),
        (err: unknown) => err instanceof RegistryProviderError && err.status === 502
      )
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("UK lookup and search propagate a network failure instead of swallowing it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("getaddrinfo ENOTFOUND api.company-information.service.gov.uk");
  };
  try {
    await withApiKey("test-key", async () => {
      await assert.rejects(() => ukProvider.lookup("00445790"), /ENOTFOUND/);
      await assert.rejects(() => ukProvider.search("Tesco"), /ENOTFOUND/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
