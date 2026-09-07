import assert from "node:assert/strict";
import test from "node:test";
import { buildFinancingDetailRows } from "./financingDetails.ts";
import type { FinancingState } from "./financingControls.ts";
import { calculateSacPriceScenario } from "./financingProjection.ts";

const state: FinancingState = {
  property: 900000,
  entry: 200000,
  financingRate: 11.5,
  termMonths: 420,
  fgtsSalary: 30000,
  fgtsSalaryGrowth: 3,
  fgtsMode: "PRAZO",
  method: "SAC",
};

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 0.005, `${actual} differs from ${expected}`);

test("term reduction keeps the reference curve and marks installments after payoff as eliminated", () => {
  const scenario = calculateSacPriceScenario(state, true);
  const rows = buildFinancingDetailRows(scenario.sac, scenario.sacReference, "PRAZO");

  assert.equal(rows.length, scenario.sacReference.schedule.length);
  assert.ok(scenario.sac.schedule.length < rows.length);
  for (const row of rows.slice(0, scenario.sac.schedule.length - 1)) {
    assert.equal(row.eliminatedByFgts, false);
    close(row.current.payment, row.reference.payment);
  }
  const payoff = rows[scenario.sac.schedule.length - 1];
  assert.equal(payoff.earlyPayoff, true);
  close(payoff.current.payment, payoff.current.amortization + payoff.current.interest);
  close(payoff.current.balance, 0);
  for (const row of rows.slice(scenario.sac.schedule.length)) {
    assert.equal(row.eliminatedByFgts, true);
    assert.equal(row.earlyPayoff, false);
    assert.equal(row.partialPayoff, false);
  }
});

test("a partial early settlement keeps its original installment as a separate reference", () => {
  const scenario = calculateSacPriceScenario(state, true);
  const reference = scenario.sacReference;
  const lastIndex = 129;
  const original = reference.schedule[lastIndex];
  const partial = {
    ...original,
    payment: 110,
    interest: 10,
    amortization: 100,
    balance: 0,
  };
  const current = {
    ...scenario.sac,
    fgtsAmortization: 1,
    schedule: [...reference.schedule.slice(0, lastIndex), partial],
  };
  const rows = buildFinancingDetailRows(current, reference, "PRAZO");
  const payoff = rows[lastIndex];

  assert.equal(payoff.earlyPayoff, true);
  assert.equal(payoff.partialPayoff, true);
  close(payoff.current.payment, 110);
  close(payoff.reference.payment, original.payment);
  assert.equal(rows[lastIndex + 1].eliminatedByFgts, true);
});

test("payment reduction pairs each recalculated installment with its no-FGTS reference", () => {
  const input = { ...state, fgtsMode: "PRESTACAO" as const };
  const scenario = calculateSacPriceScenario(input, true);
  const rows = buildFinancingDetailRows(scenario.sac, scenario.sacReference, "PRESTACAO");

  assert.equal(rows.length, scenario.sac.schedule.length);
  assert.ok(rows.every(row => !row.eliminatedByFgts));
  assert.ok(rows[24].current.payment < rows[24].reference.payment);
  close(rows[24].reference.payment, scenario.sacReference.schedule[24].payment);
});

test("the SAC and PRICE reference crossover does not move when FGTS is enabled", () => {
  const withFgts = calculateSacPriceScenario(state, true);
  const withoutFgts = calculateSacPriceScenario(state, false);
  assert.equal(withFgts.equalizationMonth, withoutFgts.equalizationMonth);
});
