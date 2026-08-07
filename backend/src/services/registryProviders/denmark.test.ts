import assert from "node:assert/strict";
import test from "node:test";
import { denmarkProvider, isValidCvr } from "./denmark.js";
import { RegistryProviderError } from "./types.js";

function company(overrides: Record<string, unknown> = {}) {
  return {
    vat: 24256790,
    name: "NOVO NORDISK A/S",
    address: "Novo Alle 1",
    zipcode: 2880,
    city: "Bagsvaerd",
    protected: false,
    phone: "44448888",
    startdate: "1989-01-01",
    employees: 27975,
    industrycode: "21200",
    industrydesc: "Manufacture of pharmaceutical preparations",
    companydesc: "Aktieselskab",
    companytypeshort: "A/S",
    status: "NORMAL",
    ...overrides,
  };
}

test("isValidCvr requires exactly 8 digits", () => {
  assert.equal(isValidCvr("24256790"), true);
  assert.equal(isValidCvr("2425679"), false);
  assert.equal(isValidCvr("242567900"), false);
  assert.equal(isValidCvr("2425679a"), false);
});

test("Denmark lookup normalizes CVR, preserves a leading zero, and withholds phone when protected", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json(company({ vat: 1234567, protected: true }));
  };
  try {
    const result = await denmarkProvider.lookup("01 23 45 67");
    assert.ok(requested[0].endsWith("/01234567"), "leading zero must survive normalization into the request URL");
    assert.equal(result.orgNr, "01234567", "leading zero dropped by APICVR's numeric `vat` field must be restored");
    assert.equal(result.contactPhone, undefined, "protected:true must withhold the phone number");
    assert.equal(result.employees, 27975);
    assert.equal(result.legalForm, "Aktieselskab (A/S)");
    assert.equal(result.address, "Novo Alle 1, 2880 Bagsvaerd");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark lookup surfaces the phone number when not advertising-protected", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(company({ protected: false, phone: "44448888" }));
  try {
    const result = await denmarkProvider.lookup("24256790");
    assert.equal(result.contactPhone, "44448888");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark lookup rejects a CVR that isn't exactly 8 digits before ever calling the network", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };
  try {
    await assert.rejects(
      () => denmarkProvider.lookup("123"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 400
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark lookup treats APICVR's HTTP-200-with-error-body as not found, not a crash", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "NOT_FOUND" });
  try {
    await assert.rejects(
      () => denmarkProvider.lookup("99999999"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 404
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark lookup distinguishes a genuine provider outage (5xx) from a not-found", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });
  try {
    await assert.rejects(
      () => denmarkProvider.lookup("24256790"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 502
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark lookup propagates a network failure instead of swallowing it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("ENOTFOUND apicvr.dk");
  };
  try {
    await assert.rejects(() => denmarkProvider.lookup("24256790"), /ENOTFOUND/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark search treats an in-progress numeric query (not yet 8 digits) as empty, never as a name search", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json([]);
  };
  try {
    const results = await denmarkProvider.search("242567");
    assert.deepEqual(results, []);
    assert.equal(called, false, "a partial CVR must never reach the network");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark search resolves an exact 8-digit query via the lookup endpoint, not name search", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json(company());
  };
  try {
    const results = await denmarkProvider.search("24256790");
    assert.equal(results.length, 1);
    assert.equal(results[0].orgNr, "24256790");
    assert.ok(!requested[0].includes("/search/company/"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark search returns an empty list for an exact CVR that doesn't exist, without throwing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "NOT_FOUND" });
  try {
    const results = await denmarkProvider.search("99999999");
    assert.deepEqual(results, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark search passes Danish characters through to the name-search endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json([company({ name: "MØLLER & SØN A/S" })]);
  };
  try {
    const results = await denmarkProvider.search("Møller Søn");
    assert.equal(results[0].name, "MØLLER & SØN A/S");
    assert.ok(decodeURIComponent(requested[0]).includes("Møller Søn"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark search ranks the company the query names above unrelated clubs/foundations sharing the name", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json([
      company({ vat: 40220771, name: "Novo Nordisk Kunstforening" }),
      company({ vat: 41103221, name: "Novo Nordisk Photoclub" }),
      company({ vat: 10582989, name: "NOVO NORDISK FONDEN" }),
      company({ vat: 24256790, name: "NOVO NORDISK A/S" }),
      company({ vat: 39440210, name: "Novo Nordisk Rideklub" }),
    ]);
  try {
    const results = await denmarkProvider.search("Novo Nordisk");
    assert.equal(results[0].orgNr, "24256790");
    assert.equal(results[0].name, "NOVO NORDISK A/S");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark search distinguishes a registry outage from a genuine no-match", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 500 });
  try {
    await assert.rejects(
      () => denmarkProvider.search("Novo"),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 502
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Denmark search propagates a network failure instead of swallowing it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network unreachable");
  };
  try {
    await assert.rejects(() => denmarkProvider.search("Novo"), /network unreachable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
