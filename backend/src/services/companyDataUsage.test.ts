import assert from "node:assert/strict";
import test from "node:test";
import { freshSingletonDb } from "./testSupport/testDb.js";

await freshSingletonDb("test-companydata-usage");
const { MONTHLY_QUOTA, recordCompanyDataCall, getCompanyDataUsage } = await import("./companyDataUsage.js");

test("a fresh month has no recorded calls", async () => {
  const usage = await getCompanyDataUsage();
  assert.equal(usage.callCount, 0);
  assert.equal(usage.quota, MONTHLY_QUOTA);
  assert.equal(usage.nearingQuota, false);
});

test("recordCompanyDataCall increments the current month's counter", async () => {
  const first = await recordCompanyDataCall();
  const second = await recordCompanyDataCall();
  assert.equal(first, 1);
  assert.equal(second, 2);
  const usage = await getCompanyDataUsage();
  assert.equal(usage.callCount, 2);
});

test("nearingQuota flips on once the count reaches 90% of the monthly quota", async () => {
  // 2 calls already recorded above; bring the total to exactly 90%.
  const target = Math.ceil(MONTHLY_QUOTA * 0.9);
  for (let i = 2; i < target; i++) await recordCompanyDataCall();
  const usage = await getCompanyDataUsage();
  assert.equal(usage.callCount, target);
  assert.equal(usage.nearingQuota, true);
});
