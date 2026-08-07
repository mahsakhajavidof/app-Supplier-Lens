import assert from "node:assert/strict";
import test from "node:test";
import { computeFinancialMetrics, headcountChange, impliedLeverage, operatingMargin, resultBeforeTaxMargin, revenueGrowth } from "./financialMetrics.js";

function year(overrides: Record<string, unknown> = {}) {
  return { year: 2025, currency: "NOK", operatingRevenue: 100, operatingResult: 10, resultBeforeTax: 8, equityRatio: 0.4, liquidityRatio: 1.5, employees: 50, ...overrides };
}

test("revenueGrowth calculates a correct percentage from two same-currency periods", () => {
  const m = revenueGrowth([year({ year: 2024, operatingRevenue: 100 }), year({ year: 2025, operatingRevenue: 120 })]);
  assert.equal(m.calculable, true);
  assert.equal(m.value, 20);
  assert.equal(m.periodLabel, "FY2025 vs FY2024");
  assert.equal(m.calculatedBySupplierLens, true);
});

test("revenueGrowth is not calculable with fewer than two periods", () => {
  const m = revenueGrowth([year()]);
  assert.equal(m.calculable, false);
  assert.equal(m.value, null);
  assert.match(m.reason!, /fewer than two/i);
});

test("revenueGrowth is not calculable when the prior period's revenue is zero", () => {
  const m = revenueGrowth([year({ year: 2024, operatingRevenue: 0 }), year({ year: 2025, operatingRevenue: 120 })]);
  assert.equal(m.calculable, false);
  assert.match(m.reason!, /zero/i);
});

test("revenueGrowth is not calculable when the reporting currency changed between periods", () => {
  const m = revenueGrowth([year({ year: 2024, currency: "NOK", operatingRevenue: 100 }), year({ year: 2025, currency: "EUR", operatingRevenue: 120 })]);
  assert.equal(m.calculable, false);
  assert.match(m.reason!, /currency/i);
});

test("revenueGrowth is not calculable when revenue is missing for a period", () => {
  const m = revenueGrowth([year({ year: 2024, operatingRevenue: undefined }), year({ year: 2025, operatingRevenue: 120 })]);
  assert.equal(m.calculable, false);
});

test("operatingMargin divides operating result by revenue for the latest period", () => {
  const m = operatingMargin([year({ year: 2024, operatingRevenue: 100, operatingResult: 5 }), year({ year: 2025, operatingRevenue: 200, operatingResult: 40 })]);
  assert.equal(m.value, 20);
  assert.equal(m.periodLabel, "FY2025");
});

test("operatingMargin is not calculable when revenue is zero", () => {
  const m = operatingMargin([year({ operatingRevenue: 0, operatingResult: 5 })]);
  assert.equal(m.calculable, false);
  assert.match(m.reason!, /zero/i);
});

test("resultBeforeTaxMargin divides result before tax by revenue", () => {
  const m = resultBeforeTaxMargin([year({ operatingRevenue: 100, resultBeforeTax: 25 })]);
  assert.equal(m.value, 25);
});

test("headcountChange calculates a correct percentage between two periods", () => {
  const m = headcountChange([year({ year: 2024, employees: 100 }), year({ year: 2025, employees: 80 })]);
  assert.equal(m.value, -20);
});

test("headcountChange is not calculable when the prior headcount is zero", () => {
  const m = headcountChange([year({ year: 2024, employees: 0 }), year({ year: 2025, employees: 10 })]);
  assert.equal(m.calculable, false);
});

test("impliedLeverage derives liabilities/assets from the reported equity ratio", () => {
  const m = impliedLeverage([year({ equityRatio: 0.3 })]);
  assert.ok(Math.abs(m.value! - 0.7) < 1e-9);
});

test("impliedLeverage is not calculable when no equity ratio is reported", () => {
  const m = impliedLeverage([year({ equityRatio: undefined })]);
  assert.equal(m.calculable, false);
});

test("computeFinancialMetrics returns all five metrics, never throwing on an empty financial history", () => {
  const metrics = computeFinancialMetrics([]);
  assert.equal(metrics.length, 5);
  assert.ok(metrics.every((m) => m.calculable === false));
});
