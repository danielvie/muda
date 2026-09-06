import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, calculateSacPriceScenario } from './financingProjection.ts';
import type { FinancingState } from './financingControls.ts';
import { buildFgtsComparison } from './fgtsSchedule.ts';
import { sacPayment } from './loanPayments.ts';
import { financingSummary, priceInstallmentAt } from './finance.ts';
import { buildFinanceVsInvestProjection, getInitialComparisonBudget, defaultFinanceVsInvestFields } from './financeVsInvestProjection.ts';

const state: FinancingState = { property: 1050000, entry: 210000, financingRate: 11.5, termMonths: 420, fgtsSalary: 30000, fgtsSalaryGrowth: 3, fgtsMode: 'PRAZO', method: 'SAC' };
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.005, `${actual} differs from ${expected}`);
const rate = Math.pow(1.115, 1 / 12) - 1;
const principal = 840000;
const quota = principal / 420;
// Independent annuity equation, not the production helper.
const annuity = (balance: number, i: number, months: number) => i === 0 ? balance / months : balance * i / (1 - Math.pow(1 + i, -months));

test('SAC PRAZO preserves quota and lowers interest and payment after FGTS', () => {
  const original = calculate(state);
  const reduced = calculate(state, true);
  close(reduced.schedule[23].fgtsApplied, 58464);
  close(reduced.schedule[24].interest, (principal - 24 * quota - 58464) * rate);
  close(reduced.schedule[24].payment, quota + reduced.schedule[24].interest);
  close(original.schedule[24].payment - reduced.schedule[24].payment, 58464 * rate);
  for (const row of reduced.schedule.slice(0, -1)) close(row.amortization, quota);
  assert.ok(reduced.schedule.at(-1)!.amortization <= quota + 0.005);
  assert.ok(reduced.schedule.length < original.schedule.length);
});

test('research SAC example uses actual balance and unchanged quota after a month-4 extra', () => {
  // The app only schedules FGTS at 24-month intervals. Exercise its shared SAC
  // payment helper with the research event instead of adding an ad hoc event API.
  const quota = 300000 / 240;
  let balance = 300000 - 4 * quota - 50000;
  close(balance, 245000);
  close(sacPayment(balance, quota, 0.008), 3210);
  const expectedMonths = Math.ceil(balance / quota);
  let months = 0;
  while (balance > 0.005) {
    const interest = balance * 0.008;
    balance -= Math.min(balance, sacPayment(balance, quota, 0.008) - interest);
    months++;
  }
  assert.equal(months, expectedMonths);
  assert.equal(months, 196);
});

test('PRICE PRAZO agrees with annuity remaining-term formula and keeps encargo', () => {
  const result = calculate({ ...state, method: 'PRICE', fgtsSalary: 3000, fgtsSalaryGrowth: 0 }, true);
  const payment = annuity(principal, rate, 420);
  for (const row of result.schedule.slice(0, -1)) close(row.payment, payment);
  const lastExtra = result.schedule.filter(row => row.fgtsApplied > 0).at(-1)!;
  assert.ok(lastExtra.balance > 0);
  const remaining = -Math.log(1 - rate * lastExtra.balance / payment) / Math.log(1 + rate);
  assert.equal(result.schedule.length - lastExtra.month, Math.ceil(remaining));
});

for (const method of ['SAC', 'PRICE'] as const) {
  for (const fgtsMode of ['PRAZO', 'PRESTACAO'] as const) {
    test(`${method} ${fgtsMode}: panel parity, annual effective rate and conservation`, () => {
      const result = calculate({ ...state, method, fgtsMode }, true);
      const comparison = buildFgtsComparison({ valorImovel: state.property, entrada: state.entry, taxaAnual: state.financingRate / 100, prazoMeses: state.termMonths, salarioMensal: state.fgtsSalary, crescimentoSalarioAnual: state.fgtsSalaryGrowth / 100, modo: fgtsMode })!;
      const other = method === 'SAC' ? comparison.sac : comparison.price;
      close(result.financingPayment, method === 'SAC' ? quota + principal * rate : annuity(principal, rate, 420));
      close(other.primeiraPrestacao, result.financingPayment);
      close(other.prestacaoAposPrimeiroFgts!, result.schedule[24].payment);
      close(other.prestacoes, result.totalPaid);
      close(other.juros, result.totalInterest);
      close(other.fgtsAmortizacao, result.fgtsAmortization);
      assert.equal(other.prazoFinalMeses, result.schedule.length);
      for (const block of other.yearBlocks) {
        const rows = result.schedule.slice(block.mesInicio - 1, block.mesFim);
        close(block.saldoFinal, rows.at(-1)!.balance);
        close(block.prestacoes, rows.reduce((sum, row) => sum + row.payment, 0));
        close(block.amortizacaoProgramada, rows.reduce((sum, row) => sum + row.amortization, 0));
      }
      close(result.totalPaid + result.fgtsAmortization, principal + result.totalInterest);
      close(other.valorEfetivoImovel, state.entry + result.totalPaid + result.fgtsAmortization);
      close(result.schedule.reduce((sum, row) => sum + row.amortization + row.fgtsApplied, 0), principal);
      close(result.termEndBalance, 0);
    });
  }
  test(`${method} PRESTACAO recalculates after FGTS over original remaining term`, () => {
    const result = calculate({ ...state, method, fgtsMode: 'PRESTACAO', fgtsSalary: 1000 }, true);
    for (const row of result.schedule) {
      if (row.fgtsApplied === 0 || row.balance <= 0.005) continue;
      const next = result.schedule[row.month];
      const remaining = 420 - row.month;
      close(next.payment, method === 'SAC' ? row.balance / remaining + row.balance * rate : annuity(row.balance, rate, remaining));
      if (method === 'SAC') close(next.amortization, row.balance / remaining);
    }
    assert.equal(result.schedule.length, 420);
  });
}

for (const fgtsMode of ['PRAZO', 'PRESTACAO'] as const) {
  test(`PRICE + difference ${fgtsMode} uses actual SAC budget and its own encargo`, () => {
    const result = calculateSacPriceScenario({ ...state, fgtsMode }, true);
    let balance = principal;
    let ownPayment = annuity(principal, rate, 420);
    let fgts = 0;
    for (const row of result.differenceSchedule) {
      const interest = balance * rate;
      const regular = Math.min(balance, ownPayment - interest);
      const budget = result.sac.schedule[row.month - 1]?.payment ?? 0;
      const extra = Math.min(balance - regular, Math.max(0, budget - ownPayment));
      close(row.scheduledPayment, ownPayment);
      close(row.extraApplied, extra);
      close(row.payment, regular + interest + extra);
      balance -= regular + extra;
      fgts += 30000 * Math.pow(1.03, Math.floor((row.month - 1) / 12)) * 0.08;
      if (row.month % 24 === 0) {
        const applied = Math.min(balance, fgts);
        close(row.fgtsApplied, applied);
        balance -= applied;
        fgts -= applied;
        if (fgtsMode === 'PRESTACAO' && applied > 0 && row.month < 420) ownPayment = annuity(balance, rate, 420 - row.month);
      }
      close(row.balance, balance);
    }
    if (fgtsMode === 'PRESTACAO') assert.ok(result.differenceSchedule[24].scheduledPayment < result.price.schedule[24].scheduledPayment);
    close(result.totalPaid + result.fgtsAmortization, principal + result.totalInterest);
    close(result.extraAmortization, result.differenceSchedule.reduce((sum, row) => sum + row.extraApplied, 0));
    close(result.totalPaid, result.differenceSchedule.reduce((sum, row) => sum + row.payment, 0));
    close(result.differenceSchedule.at(-1)!.balance, 0);
    assert.equal(result.payoffMonth, result.differenceSchedule.length);
    const first = result.sac.schedule.find(row => result.price.schedule[row.month - 1] && row.payment <= result.price.schedule[row.month - 1].payment + 0.005);
    assert.equal(result.equalizationMonth, first?.month ?? null);
  });
}

test('difference never spends an absent SAC budget and caps its final cash payment', () => {
  const result = calculateSacPriceScenario({ ...state, fgtsSalary: 400000, fgtsSalaryGrowth: 0 }, true);
  for (const row of result.differenceSchedule) {
    const sac = result.sac.schedule[row.month - 1];
    if (!sac || sac.payment <= row.scheduledPayment) close(row.extraApplied, 0);
  }
  assert.ok(result.differenceSchedule.length <= result.sac.schedule.length);
  const last = result.differenceSchedule.at(-1)!;
  assert.ok(last.payment < last.scheduledPayment);
  close(last.extraApplied, 0);
});

test('zero deposits do not change either method or the difference strategy', () => {
  const input = { ...state, fgtsSalary: 0 };
  assert.deepEqual(calculateSacPriceScenario(input, true), calculateSacPriceScenario(input, false));
});

test('no FGTS matches standalone finance summaries with the same effective rate', () => {
  for (const method of ['SAC', 'PRICE'] as const) {
    const result = calculate({ ...state, method });
    const summary = financingSummary({ valorImovel: state.property, entrada: state.entry, taxaAnual: 0.115, prazoMeses: 420 }, 1, method);
    close(result.financingPayment, summary.prestacaoMes1);
    close(result.financingPaymentEnd, summary.prestacaoUltima);
    close(result.totalPaid, summary.totalPago);
  }
});

test('zero rate stays finite in PRICE installments, summaries and comparison budget', () => {
  const input = { valorImovel: 300000, entrada: 0, taxaAnual: 0, prazoMeses: 240 };
  for (const month of [1, 120, 240]) {
    const row = priceInstallmentAt(input, month);
    close(row.prestacao, 1250);
    close(row.amortizacao, 1250);
    close(row.juros, 0);
    close(row.saldoDevedorInicial, 300000 - (month - 1) * 1250);
  }
  close(financingSummary(input, 1, 'PRICE').totalPago, 300000);
  const fields = { ...defaultFinanceVsInvestFields, propertyPrice: '300000', availableMoney: '0', financingAnnualRate: '0', financingTermMonths: '240', amortizationMethod: 'PRICE' as const, monthlyRent: '0', monthlyOwnershipCost: '0', horizonYears: '21' };
  close(getInitialComparisonBudget(fields), 1250);
  const comparison = buildFinanceVsInvestProjection(fields)!;
  assert.ok(comparison);
  assert.ok(Number.isFinite(comparison.finalFinanceNetWorth));
  close(comparison.months[119].loanBalance, 150000);
  close(comparison.months[239].loanBalance, 0);
  close(comparison.months[240].mortgageCost, 0);
});

test('huge FGTS, zero interest and zero debt never overpay or charge after payoff', () => {
  for (const fgtsMode of ['PRAZO', 'PRESTACAO'] as const) {
    for (const input of [{ ...state, fgtsMode, fgtsSalary: 1000000 }, { ...state, fgtsMode, financingRate: 0 }, { ...state, fgtsMode, entry: state.property }]) {
      const result = calculateSacPriceScenario(input, true);
      for (const loan of [result.sac, result.price]) {
        close(loan.totalPaid + loan.fgtsAmortization, loan.financedAmount + loan.totalInterest);
        close(loan.termEndBalance, 0);
        if (input.fgtsSalary === 1000000) assert.equal(loan.schedule.length, 24);
        if (input.financingRate === 0) close(loan.totalInterest, 0);
        if (input.entry === input.property) assert.equal(loan.schedule.length, 0);
      }
      close(result.totalPaid + result.fgtsAmortization, result.price.financedAmount + result.totalInterest);
      if (input.entry === input.property) assert.equal(result.payoffMonth, 0);
    }
  }
});
