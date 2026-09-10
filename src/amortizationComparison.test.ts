import test from "node:test";
import assert from "node:assert/strict";
import { compareAmortization, parseInvestmentRate } from "./amortizationComparison.ts";
import { calculateSacPriceScenario } from "./financingProjection.ts";
import { fgtsDepositForMonth } from "./fgtsPolicy.ts";
import type { FinancingState } from "./financingControls.ts";

const state: FinancingState = { property: 800000, entry: 120000, financingRate: 11, termMonths: 420, method: "PRICE", fgtsSalary: 20000, fgtsSalaryGrowth: 3, fgtsMode: "PRAZO" };
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.005, `${a} != ${b}`);
function ready(input = state, fgts = false, rate = 14) {
  const result = compareAmortization(input, fgts, rate);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") throw new Error("Expected a comparison");
  return result;
}

for (const fgtsMode of ["PRAZO", "PRESTACAO"] as const) {
  for (const includeFgts of [false, true]) {
    for (const rate of [0, 11, 14]) {
      test(`common budget and month; loan, cash, investment and FGTS conservation: ${fgtsMode}, FGTS ${includeFgts}, return ${rate}`, () => {
        const input = { ...state, fgtsMode };
        const before = structuredClone(input);
        const result = ready(input, includeFgts, rate);
        assert.equal(result.crossingMonth, 105);
        close(result.amortize.atCrossing.cashCommitted, result.invest.atCrossing.cashCommitted);
        const reference = calculateSacPriceScenario(input, false);
        assert.equal(result.crossingMonth, reference.equalizationMonth);
        for (const strategy of [result.amortize, result.invest]) {
          let principalPaid = 0, cash = input.entry, contributions = 0, earnings = 0, redemptions = 0, fgtsUsed = 0, deposits = 0;
          for (const row of strategy.schedule) {
            if (includeFgts) deposits += fgtsDepositForMonth(input.fgtsSalary, input.fgtsSalaryGrowth / 100, row.month);
            principalPaid += row.payment - row.interest + row.extra + row.redemption + row.fgtsApplied;
            cash += row.cash;
            contributions += row.contribution;
            earnings += row.earnings;
            redemptions += row.redemption;
            fgtsUsed += row.fgtsApplied;
            close(row.debt + principalPaid, input.property - input.entry);
            close(row.cashCommitted, cash);
            close(row.investment, contributions + earnings - redemptions);
            close(row.fgtsRemaining + fgtsUsed, deposits);
            close(row.cash, row.payment + row.extra + row.contribution);
            if (row.month <= result.crossingMonth) close(row.cash, result.budgets[row.month - 1]);
            else { assert.equal(row.contribution, 0); assert.equal(row.redemption, 0); }
            if (row.month > strategy.payoffMonth!) { close(row.payment, 0); close(row.extra, 0); close(row.fgtsApplied, 0); }
          }
          assert.ok(strategy.payoffMonth! <= input.termMonths);
          close(strategy.schedule.at(-1)!.debt, 0);
          close(strategy.position, strategy.atCrossing.investment + strategy.atCrossing.fgtsRemaining - strategy.atCrossing.debt);
          close(strategy.cashUntilPayoff!, strategy.schedule[strategy.payoffMonth! - 1].cashCommitted);
        }
        assert.deepEqual(input, before);
      });
    }
  }
}

test("11% financing vs 14% investing: identical cash but less debt after partial redemption at crossover", () => {
  const result = ready();
  assert.equal(result.better, "invest");
  assert.ok(result.invest.atCrossing.redemption > 0);
  assert.ok(result.invest.atCrossing.debt > 0);
  assert.ok(result.invest.atCrossing.debt < result.amortize.atCrossing.debt);
  close(result.invest.atCrossing.investment, 0);
  close(result.advantage, result.amortize.atCrossing.debt - result.invest.atCrossing.debt);
  const sameRate = ready(state, false, 11);
  assert.equal(sameRate.better, "tie");
  assert.equal(ready(state, false, 0).better, "amortize");
});

test("a high return does not trigger early automatic payoff; excess money survives the single redemption", () => {
  const result = ready(state, false, 100);
  const earlier = result.invest.schedule.slice(0, result.crossingMonth - 1);
  assert.ok(earlier.some(row => row.investment >= row.debt && row.debt > 0));
  assert.ok(earlier.every(row => row.redemption === 0));
  assert.equal(result.invest.payoffMonth, result.crossingMonth);
  assert.equal(result.invest.atCrossing.debt, 0);
  assert.ok(result.invest.atCrossing.investment > 0);
  assert.equal(result.invest.schedule.filter(row => row.redemption > 0).length, 1);
});

test("early FGTS payoff keeps both budgets funded through the common date and unused FGTS remains an asset", () => {
  const result = ready({ ...state, fgtsSalary: 1e8, fgtsSalaryGrowth: 0 }, true);
  for (const strategy of [result.amortize, result.invest]) {
    assert.ok(strategy.payoffMonth! < result.crossingMonth);
    assert.ok(strategy.atCrossing.investment > 0);
    assert.ok(strategy.atCrossing.fgtsRemaining > 0);
    assert.ok(strategy.atCrossing.cashCommitted > strategy.cashUntilPayoff!);
  }
  close(result.amortize.atCrossing.cashCommitted, result.invest.atCrossing.cashCommitted);
  assert.equal(result.invest.atCrossing.redemption, 0);
});

test("crossover and budget are independent of strategy, FGTS use, loan selector and investment rate", () => {
  const baseline = ready();
  for (const fgtsMode of ["PRAZO", "PRESTACAO"] as const) {
    const other = ready({ ...state, method: "SAC", fgtsMode }, true, 0);
    assert.equal(other.crossingMonth, baseline.crossingMonth);
    assert.deepEqual(other.budgets, baseline.budgets);
  }
});

test("zero loan rate, zero debt and invalid investment rates are explicit", () => {
  assert.deepEqual(compareAmortization({ ...state, entry: state.property }, true, 14), { status: "no-debt" });
  const zero = ready({ ...state, financingRate: 0 }, false, 14);
  assert.equal(zero.crossingMonth, 1);
  assert.equal(zero.better, "tie");
  assert.equal(zero.invest.atCrossing.redemption, 0);
  for (const value of ["", " ", "abc", "Infinity", "-1", "101", "1,2,3"]) assert.equal(parseInvestmentRate(value), null);
  assert.equal(parseInvestmentRate("0"), 0);
  assert.equal(parseInvestmentRate("14,5"), 14.5);
  for (const value of [-1, 101, NaN, Infinity]) assert.throws(() => compareAmortization(state, false, value), RangeError);
});
