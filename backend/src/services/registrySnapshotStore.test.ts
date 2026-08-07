import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { freshSingletonDb } from "./testSupport/testDb.js";

const db = await freshSingletonDb("test-registry-snapshot-store");
const schema = await import("../db/schema.js");
const { hashOf, getLatestSnapshot, readSnapshotNormalized, saveSnapshot, logCheckResult } = await import("./registrySnapshotStore.js");

async function makeSubcontractor(orgNr: string, country = "DK") {
  const [sub] = await db.insert(schema.subcontractors).values({ company: "Test Co", orgNr, country, category: "Other" }).returning();
  return sub.id;
}

test("hashOf is deterministic for the same data and differs for different data", () => {
  const a = hashOf({ name: "Novo Nordisk", employees: 27975 });
  const b = hashOf({ name: "Novo Nordisk", employees: 27975 });
  const c = hashOf({ name: "Novo Nordisk", employees: 28000 });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("saveSnapshot + getLatestSnapshot round-trip an untagged (NO/GB-style) snapshot", async () => {
  const id = await makeSubcontractor("923609016", "NO");
  await saveSnapshot({ subcontractorId: id, country: "NO", normalized: { name: "EQUINOR ASA", version: 1 } });
  await saveSnapshot({ subcontractorId: id, country: "NO", normalized: { name: "EQUINOR ASA", version: 2 } });

  const latest = await getLatestSnapshot(id);
  assert.ok(latest);
  assert.equal(latest!.provider, null);
  assert.equal(latest!.dataType, null);
  assert.deepEqual(readSnapshotNormalized(latest!), { name: "EQUINOR ASA", version: 2 });
});

test("tagged (provider, dataType) snapshots for the same supplier never collide with each other or with an untagged snapshot", async () => {
  const id = await makeSubcontractor("24256790", "DK");
  await saveSnapshot({ subcontractorId: id, country: "DK", provider: "APICVR", dataType: "basic_profile", normalized: { name: "Novo Nordisk" } });
  await saveSnapshot({ subcontractorId: id, country: "DK", provider: "CompanyData.dk", dataType: "financials", normalized: { year: 2025 } });
  await saveSnapshot({ subcontractorId: id, country: "DK", provider: "CompanyData.dk", dataType: "ownership", normalized: { owners: [] } });

  const basic = await getLatestSnapshot(id, "APICVR", "basic_profile");
  const financials = await getLatestSnapshot(id, "CompanyData.dk", "financials");
  const ownership = await getLatestSnapshot(id, "CompanyData.dk", "ownership");
  const untagged = await getLatestSnapshot(id);

  assert.deepEqual(readSnapshotNormalized(basic!), { name: "Novo Nordisk" });
  assert.deepEqual(readSnapshotNormalized(financials!), { year: 2025 });
  assert.deepEqual(readSnapshotNormalized(ownership!), { owners: [] });
  assert.equal(untagged, undefined, "a supplier with only tagged snapshots must not appear to have an untagged one");
});

test("saveSnapshot returns the hash it stored, matching hashOf of the same data", async () => {
  const id = await makeSubcontractor("11111111", "DK");
  const data = { name: "Test", employees: 5 };
  const hash = await saveSnapshot({ subcontractorId: id, country: "DK", provider: "APICVR", dataType: "basic_profile", normalized: data });
  assert.equal(hash, hashOf(data));
  const stored = await getLatestSnapshot(id, "APICVR", "basic_profile");
  assert.equal(stored!.hash, hash);
});

test("logCheckResult records a failure without ever creating a snapshot row", async () => {
  const id = await makeSubcontractor("22222222", "DK");
  await logCheckResult({ subcontractorId: id, provider: "CompanyData.dk", dataType: "financials", success: false, statusCode: 401, errorMessage: "CompanyData.dk rejected the configured API key" });

  const logs = await db.query.registryCheckLog.findMany({ where: eq(schema.registryCheckLog.subcontractorId, id) });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].success, false);
  assert.equal(logs[0].statusCode, 401);

  const snapshot = await getLatestSnapshot(id, "CompanyData.dk", "financials");
  assert.equal(snapshot, undefined, "a failed attempt must never be mistaken for valid company data");
});
