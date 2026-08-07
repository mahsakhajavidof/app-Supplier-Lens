import assert from "node:assert/strict";
import test from "node:test";
import { freshSingletonDb } from "./testSupport/testDb.js";

const db = await freshSingletonDb("test-risk-indicator-decisions");
const schema = await import("../db/schema.js");
const { recordDecision, getCurrentDecisions, getDecisionHistory } = await import("./riskIndicatorDecisions.js");

async function makeSubcontractor(orgNr: string) {
  const [sub] = await db.insert(schema.subcontractors).values({ company: "Test Co", orgNr, category: "Other" }).returning();
  return sub.id;
}

test("recording a decision creates a row with the given status and note", async () => {
  const id = await makeSubcontractor("10000001");
  const row = await recordDecision({ subcontractorId: id, indicatorKey: "liquidity_ratio", status: "ACCEPTED", note: "Reviewed with finance." });
  assert.equal(row.status, "ACCEPTED");
  assert.equal(row.note, "Reviewed with finance.");
});

test("getCurrentDecisions returns the most recent decision per indicator, not the first", async () => {
  const id = await makeSubcontractor("10000002");
  await recordDecision({ subcontractorId: id, indicatorKey: "leverage", status: "NOT_REVIEWED" });
  await recordDecision({ subcontractorId: id, indicatorKey: "leverage", status: "ACCEPTED" });
  await recordDecision({ subcontractorId: id, indicatorKey: "leverage", status: "RESOLVED" });

  const current = await getCurrentDecisions(id);
  assert.equal(current.get("leverage")?.status, "RESOLVED");
});

test("changing a decision preserves history rather than overwriting it", async () => {
  const id = await makeSubcontractor("10000003");
  await recordDecision({ subcontractorId: id, indicatorKey: "equity_ratio", status: "NOT_REVIEWED" });
  await recordDecision({ subcontractorId: id, indicatorKey: "equity_ratio", status: "NOT_RELEVANT", note: "Confirmed acceptable." });

  const history = await getDecisionHistory(id, "equity_ratio");
  assert.equal(history.length, 2);
  assert.equal(history[0].status, "NOT_REVIEWED");
  assert.equal(history[1].status, "NOT_RELEVANT");
});

test("decisions for different indicators on the same supplier never collide", async () => {
  const id = await makeSubcontractor("10000004");
  await recordDecision({ subcontractorId: id, indicatorKey: "liquidity_ratio", status: "ACCEPTED" });
  await recordDecision({ subcontractorId: id, indicatorKey: "leverage", status: "NOT_RELEVANT", note: "n/a" });

  const current = await getCurrentDecisions(id);
  assert.equal(current.get("liquidity_ratio")?.status, "ACCEPTED");
  assert.equal(current.get("leverage")?.status, "NOT_RELEVANT");
});
