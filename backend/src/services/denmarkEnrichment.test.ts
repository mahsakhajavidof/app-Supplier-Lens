import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { freshSingletonDb } from "./testSupport/testDb.js";

const db = await freshSingletonDb("test-denmark-enrichment");
const schema = await import("../db/schema.js");
const { runCompanyDataEnrichment } = await import("./denmarkEnrichment.js");

async function makeSubcontractor(orgNr: string) {
  const [sub] = await db.insert(schema.subcontractors).values({ company: "Novo Nordisk A/S", orgNr, country: "DK", category: "Other" }).returning();
  return sub.id;
}

function financialsPayload(revenue: number) {
  return [{ year: 2025, revenue, result: revenue / 10 }];
}
function ownershipPayload(pct: number) {
  return { owners: [{ name: "Novo Holdings", percentage: pct }], beneficialOwnersAvailable: true };
}
function managementPayload(name: string) {
  return { management: [{ name, title: "CEO" }] };
}

function mockFetch(financials: unknown, ownership: unknown, management: unknown, opts: { financialsStatus?: number } = {}) {
  return async (input: unknown) => {
    const url = String(input);
    if (url.includes("/financials")) {
      if (opts.financialsStatus) return new Response(null, { status: opts.financialsStatus });
      return Response.json(financials);
    }
    if (url.includes("/ownership")) return Response.json(ownership);
    if (url.includes("/management")) return Response.json(management);
    throw new Error(`unexpected URL in test: ${url}`);
  };
}

function withApiKey<T>(fn: () => Promise<T>): Promise<T> {
  process.env.COMPANYDATA_DK_API_KEY = "a-test-key";
  return fn();
}

test("without a configured key, enrichment is a no-op and never touches the network", async () => {
  delete process.env.COMPANYDATA_DK_API_KEY;
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };
  try {
    const id = await makeSubcontractor("10000001");
    const events = await runCompanyDataEnrichment(id, "DK", "10000001");
    assert.deepEqual(events, []);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the first enrichment ever recorded is the baseline: data is applied but no change events are created", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(financialsPayload(100), ownershipPayload(50), managementPayload("Ada Nord"));
  try {
    const id = await makeSubcontractor("10000002");
    const events = await withApiKey(() => runCompanyDataEnrichment(id, "DK", "10000002"));
    assert.deepEqual(events, []);

    const financials = await db.query.financialYears.findMany({ where: eq(schema.financialYears.subcontractorId, id) });
    assert.equal(financials.length, 1);
    assert.equal(financials[0].operatingRevenue, 100);

    const owners = await db.query.ownerships.findMany({ where: eq(schema.ownerships.subcontractorId, id) });
    assert.equal(owners[0].sharePercent, 50);

    const people = await db.query.people.findMany({ where: eq(schema.people.subcontractorId, id) });
    assert.equal(people[0].name, "Ada Nord");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a real change on a later check produces exactly one event per changed data type", async () => {
  const originalFetch = globalThis.fetch;
  const id = await makeSubcontractor("10000003");
  try {
    globalThis.fetch = mockFetch(financialsPayload(100), ownershipPayload(50), managementPayload("Ada Nord"));
    await withApiKey(() => runCompanyDataEnrichment(id, "DK", "10000003"));

    globalThis.fetch = mockFetch(financialsPayload(120), ownershipPayload(75), managementPayload("Bo Berg"));
    const events = await withApiKey(() => runCompanyDataEnrichment(id, "DK", "10000003"));
    assert.equal(events.length, 3);
    assert.ok(events.some((e) => e.type.includes("Financial figures changed")));
    assert.ok(events.some((e) => e.type === "Ownership changed"));
    assert.ok(events.some((e) => e.type === "Management changed"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an unchanged repeat produces no duplicate events", async () => {
  const originalFetch = globalThis.fetch;
  const id = await makeSubcontractor("10000004");
  try {
    globalThis.fetch = mockFetch(financialsPayload(200), ownershipPayload(60), managementPayload("Ada Nord"));
    await withApiKey(() => runCompanyDataEnrichment(id, "DK", "10000004"));
    const events = await withApiKey(() => runCompanyDataEnrichment(id, "DK", "10000004"));
    assert.deepEqual(events, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one data type failing (e.g. financials rejected) never blocks ownership/management from succeeding", async () => {
  const originalFetch = globalThis.fetch;
  const id = await makeSubcontractor("10000005");
  try {
    globalThis.fetch = mockFetch(financialsPayload(1), ownershipPayload(50), managementPayload("Ada Nord"), { financialsStatus: 401 });
    const events = await withApiKey(() => runCompanyDataEnrichment(id, "DK", "10000005"));
    assert.deepEqual(events, []); // baseline for the two that succeeded, silent failure for financials

    const financials = await db.query.financialYears.findMany({ where: eq(schema.financialYears.subcontractorId, id) });
    assert.equal(financials.length, 0, "a rejected financials call must not write any financial data");

    const owners = await db.query.ownerships.findMany({ where: eq(schema.ownerships.subcontractorId, id) });
    assert.equal(owners.length, 1, "ownership must still succeed independently of financials failing");

    const logs = await db.query.registryCheckLog.findMany({ where: eq(schema.registryCheckLog.subcontractorId, id) });
    const financialsLog = logs.find((l) => l.dataType === "financials");
    assert.equal(financialsLog?.success, false);
    assert.equal(financialsLog?.statusCode, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
