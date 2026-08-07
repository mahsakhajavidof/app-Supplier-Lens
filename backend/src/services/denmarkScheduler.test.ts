import assert from "node:assert/strict";
import test from "node:test";
import { freshSingletonDb } from "./testSupport/testDb.js";

delete process.env.COMPANYDATA_DK_API_KEY;

const db = await freshSingletonDb("test-denmark-scheduler");
const schema = await import("../db/schema.js");
const { runDueDanishChecks } = await import("./denmarkScheduler.js");

async function makeSubcontractor(overrides: Record<string, unknown> = {}) {
  const [sub] = await db
    .insert(schema.subcontractors)
    .values({ company: "Test Co", orgNr: "24256790", country: "DK", category: "Other", ...overrides })
    .returning();
  return sub.id;
}

function apicvrCompany(vat: number) {
  return { vat, name: "TEST CO", protected: false, status: "NORMAL" };
}

test("a due, active Danish supplier is checked; inactive, not-yet-due, and non-Danish suppliers are skipped", async () => {
  const originalFetch = globalThis.fetch;
  const requestedCvrs: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    const cvr = url.split("/").pop()!;
    requestedCvrs.push(cvr);
    return Response.json(apicvrCompany(Number(cvr)));
  };
  try {
    const dueActive = await makeSubcontractor({ orgNr: "10000010", active: true, nextCheckAt: null });
    await makeSubcontractor({ orgNr: "10000020", active: false, nextCheckAt: null }); // inactive: must be skipped
    await makeSubcontractor({ orgNr: "10000030", active: true, nextCheckAt: new Date(Date.now() + 999_999_999) }); // not due yet
    await makeSubcontractor({ orgNr: "923609016", country: "NO", active: true, nextCheckAt: null }); // wrong country

    const result = await runDueDanishChecks();
    assert.equal(result.checked, 1);
    assert.equal(result.failed, 0);
    assert.deepEqual(requestedCvrs, ["10000010"]);

    const sub = await db.query.subcontractors.findFirst({ where: (t, { eq }) => eq(t.id, dueActive) });
    assert.ok(sub!.nextCheckAt, "a checked supplier must have its next check scheduled");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("calling runDueDanishChecks while a sweep is already running is a no-op, never a duplicate check", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount++;
    const cvr = String(input).split("/").pop()!;
    return Response.json(apicvrCompany(Number(cvr)));
  };
  try {
    await makeSubcontractor({ orgNr: "10000040", active: true, nextCheckAt: null });

    const first = runDueDanishChecks();
    const second = runDueDanishChecks();
    const secondResult = await second;
    assert.deepEqual(secondResult, { checked: 0, failed: 0 }, "an overlapping call must not run a second sweep");
    const firstResult = await first;
    assert.equal(firstResult.checked, 1);
    assert.equal(fetchCount, 1, "only the first sweep should have made any request");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one supplier's failure does not block another supplier's check in the same sweep", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const cvr = String(input).split("/").pop()!;
    if (cvr === "10000050") return new Response(null, { status: 503 });
    return Response.json(apicvrCompany(Number(cvr)));
  };
  try {
    await makeSubcontractor({ orgNr: "10000050", active: true, nextCheckAt: null }); // will fail
    await makeSubcontractor({ orgNr: "10000060", active: true, nextCheckAt: null }); // will succeed

    const result = await runDueDanishChecks();
    assert.equal(result.checked, 1);
    assert.equal(result.failed, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
