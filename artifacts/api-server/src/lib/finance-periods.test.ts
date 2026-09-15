import test from "node:test";
import assert from "node:assert/strict";
import { getFinancePeriodRange, summarizeFinanceTransactions } from "./finance-periods";

test("month range respects the farm timezone", () => {
  const now = new Date("2026-03-31T23:30:00Z");
  assert.deepEqual(getFinancePeriodRange("month", { now, timeZone: "Africa/Harare" }), {
    start: "2026-03-01",
    end: "2026-03-31",
  });
});

test("week range is Monday through Sunday", () => {
  const now = new Date("2026-09-15T08:00:00Z");
  assert.deepEqual(getFinancePeriodRange("week", { now, timeZone: "Africa/Harare" }), {
    start: "2026-09-14",
    end: "2026-09-20",
  });
});

test("custom periods reject reversed dates", () => {
  assert.throws(() => getFinancePeriodRange("custom", { start: "2026-09-20", end: "2026-09-19" }));
});

test("finance summary filters by period and farm", () => {
  const result = summarizeFinanceTransactions(
    [
      { farmId: "farm-a", type: "income", amount: "100", transactionDate: "2026-09-10" },
      { farmId: "farm-a", type: "expense", amount: "25", transactionDate: "2026-09-11" },
      { farmId: "farm-b", type: "income", amount: "999", transactionDate: "2026-09-11" },
      { farmId: "farm-a", type: "income", amount: "50", transactionDate: "2026-08-31" },
    ],
    { start: "2026-09-01", end: "2026-09-30" },
    "farm-a",
  );

  assert.equal(result.revenue, 100);
  assert.equal(result.expenses, 25);
  assert.equal(result.profit, 75);
  assert.equal(result.transactionCount, 2);
});
