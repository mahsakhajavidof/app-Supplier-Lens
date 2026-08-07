import assert from "node:assert/strict";
import test, { after } from "node:test";
import type { AddressInfo } from "node:net";
import { freshSingletonDb } from "../services/testSupport/testDb.js";

const db = await freshSingletonDb("test-risk-assessment-routes");
const schema = await import("../db/schema.js");
const { createApp } = await import("../app.js");

const server = createApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
after(() => server.close());

async function makeSubcontractor(liquidityRatio: number) {
  const [sub] = await db.insert(schema.subcontractors).values({ company: "Route Test Co", orgNr: "20000001", category: "Other" }).returning();
  await db.insert(schema.financialYears).values({ subcontractorId: sub.id, year: 2025, operatingRevenue: 100, operatingResult: 5, liquidityRatio });
  return sub.id;
}

async function json(res: Response): Promise<any> {
  return res.json();
}

test("GET risk-assessment for an unknown subcontractor returns 404", async () => {
  const res = await fetch(`${base}/subcontractors/00000000-0000-0000-0000-000000000000/risk-assessment`);
  assert.equal(res.status, 404);
});

test("GET risk-assessment reflects a low liquidity ratio as an Attention indicator", async () => {
  const id = await makeSubcontractor(1.0);
  const res = await fetch(`${base}/subcontractors/${id}/risk-assessment`);
  assert.equal(res.status, 200);
  const body = await json(res);
  const liquidity = body.indicators.find((i: any) => i.key === "liquidity_ratio");
  assert.equal(liquidity.status, "Attention");
});

test("dismissing an Attention indicator as not relevant without a note is rejected", async () => {
  const id = await makeSubcontractor(1.0);
  const res = await fetch(`${base}/subcontractors/${id}/risk-assessment/indicators/liquidity_ratio/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "NOT_RELEVANT" }),
  });
  assert.equal(res.status, 400);
});

test("dismissing an Attention indicator as not relevant with a note succeeds and is reflected on the next read", async () => {
  const id = await makeSubcontractor(1.0);
  const post = await fetch(`${base}/subcontractors/${id}/risk-assessment/indicators/liquidity_ratio/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "NOT_RELEVANT", note: "Confirmed acceptable with the supplier." }),
  });
  assert.equal(post.status, 201);
  const postBody = await json(post);
  assert.equal(postBody.status, "Not relevant"); // human-readable label, not the raw enum

  const get = await fetch(`${base}/subcontractors/${id}/risk-assessment`);
  const getBody = await json(get);
  const decision = getBody.decisions.find((d: any) => d.indicatorKey === "liquidity_ratio");
  assert.equal(decision.status, "Not relevant");
  assert.equal(decision.note, "Confirmed acceptable with the supplier.");
});

test("a decision that isn't a dismissal of an important indicator never requires a note", async () => {
  const id = await makeSubcontractor(1.0);
  const res = await fetch(`${base}/subcontractors/${id}/risk-assessment/indicators/liquidity_ratio/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ACCEPTED" }),
  });
  assert.equal(res.status, 201);
});

test("converting an indicator to a task creates a task linked back to it, pre-filled with its evidence", async () => {
  const id = await makeSubcontractor(1.0);
  const res = await fetch(`${base}/subcontractors/${id}/risk-assessment/indicators/liquidity_ratio/convert-to-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 201);
  const task = await json(res);
  assert.equal(task.subcontractorId, id);
  assert.match(task.title, /Liquidity/);
  assert.ok(task.comment.includes("1"), "comment should reference the observed liquidity ratio");

  const stored = await db.query.tasks.findFirst({ where: (t: any, { eq }: any) => eq(t.id, task.id) });
  assert.equal(stored!.sourceIndicatorKey, "liquidity_ratio");
});

test("GET the negotiation brief returns a document naming the supplier and its indicators", async () => {
  const id = await makeSubcontractor(1.0);
  const res = await fetch(`${base}/subcontractors/${id}/risk-assessment/brief`);
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.match(body.brief, /Route Test Co/);
  assert.match(body.brief, /Liquidity/);
  assert.match(body.brief, /not an official rating/i);
});

test("acting on an unknown indicator key returns 404, not a silent success", async () => {
  const id = await makeSubcontractor(1.0);
  const res = await fetch(`${base}/subcontractors/${id}/risk-assessment/indicators/not_a_real_indicator/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ACCEPTED" }),
  });
  assert.equal(res.status, 404);
});
