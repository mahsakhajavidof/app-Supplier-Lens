import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { freshSingletonDb } from "./testSupport/testDb.js";

delete process.env.COMPANYDATA_DK_API_KEY; // isolate these tests to the APICVR basic-profile path

const db = await freshSingletonDb("test-denmark-monitoring");
const schema = await import("../db/schema.js");
const { checkDanishSupplier } = await import("./denmarkMonitoring.js");
const { RegistryProviderError } = await import("./registryProviders/types.js");

async function makeSubcontractor(orgNr: string) {
  const [sub] = await db.insert(schema.subcontractors).values({ company: "Novo Nordisk A/S", orgNr, country: "DK", category: "Other" }).returning();
  return sub.id;
}

function apicvrCompany(overrides: Record<string, unknown> = {}) {
  return { vat: 24256790, name: "NOVO NORDISK A/S", protected: false, status: "NORMAL", startdate: "1989-01-01", companydesc: "Aktieselskab", companytypeshort: "A/S", ...overrides };
}

test("a successful check stamps lastCheckAttemptedAt, lastCheckedAt and schedules nextCheckAt about a week out", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(apicvrCompany());
  try {
    const id = await makeSubcontractor("24256790");
    const before = Date.now();
    await checkDanishSupplier(id);
    const sub = await db.query.subcontractors.findFirst({ where: eq(schema.subcontractors.id, id) });
    assert.ok(sub!.lastCheckAttemptedAt);
    // Stored as whole seconds (SQLite unixepoch()), so allow up to 1s of
    // truncation slack against the ms-precision `before` timestamp.
    assert.ok(sub!.lastCheckedAt.getTime() >= before - 1000);
    assert.ok(sub!.nextCheckAt);
    const daysOut = (sub!.nextCheckAt!.getTime() - before) / (24 * 60 * 60 * 1000);
    assert.ok(daysOut > 6.9 && daysOut < 7.1, `expected ~7 days out, got ${daysOut}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a legal-form or registration-date change (Denmark's extra watched fields) is detected on the next check", async () => {
  const originalFetch = globalThis.fetch;
  const id = await makeSubcontractor("24256791");
  try {
    globalThis.fetch = async () => Response.json(apicvrCompany({ vat: 24256791, companydesc: "Aktieselskab" }));
    await checkDanishSupplier(id);

    globalThis.fetch = async () => Response.json(apicvrCompany({ vat: 24256791, companydesc: "Anpartsselskab" }));
    const { createdEvents } = await checkDanishSupplier(id);
    assert.ok(createdEvents.some((e) => e.type === "Legal form changed"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an unchanged repeat produces no duplicate basic-profile events", async () => {
  const originalFetch = globalThis.fetch;
  const id = await makeSubcontractor("24256792");
  try {
    globalThis.fetch = async () => Response.json(apicvrCompany({ vat: 24256792 }));
    await checkDanishSupplier(id);
    const { createdEvents } = await checkDanishSupplier(id);
    assert.deepEqual(createdEvents, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an APICVR failure is logged and thrown, never silently swallowed into an empty result", async () => {
  const originalFetch = globalThis.fetch;
  const id = await makeSubcontractor("24256793");
  try {
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(
      () => checkDanishSupplier(id),
      (err: unknown) => err instanceof RegistryProviderError && err.status === 502
    );
    const logs = await db.query.registryCheckLog.findMany({ where: eq(schema.registryCheckLog.subcontractorId, id) });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].success, false);
    assert.equal(logs[0].provider, "APICVR");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checking a subcontractor that doesn't exist throws a 404, not a silent no-op", async () => {
  await assert.rejects(
    () => checkDanishSupplier("00000000-0000-0000-0000-000000000000"),
    (err: unknown) => err instanceof RegistryProviderError && err.status === 404
  );
});
