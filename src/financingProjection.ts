import { annualToMonthlyRate } from "./finance.ts";
import type { FinancingState } from "./financingControls.ts";
import { fgtsDepositForMonth, FGTS_USE_INTERVAL_MONTHS } from "./fgtsPolicy.ts";
import { sacPayment, fixedPricePayment, originalSacPayment } from "./loanPayments.ts";

const BALANCE_TOLERANCE = 0.005;
export type ScheduleRow = {
  month: number;
  scheduledPayment: number;
  payment: number;
  interest: number;
  amortization: number;
  fgtsApplied: number;
  balance: number;
};
export type Calculation = {
  financedAmount: number; financingPayment: number; financingPaymentEnd: number;
  totalPaid: number; totalInterest: number; termEndBalance: number;
  fgtsAmortization: number; schedule: ScheduleRow[];
};
export type SacPriceScenarioCalculation = {
  sac: Calculation; price: Calculation;
  sacReference: Calculation; priceReference: Calculation;
  equalizationMonth: number | null;
  payoffMonth: number; extraAmortization: number; totalPaid: number; totalInterest: number;
  fgtsAmortization: number; differenceSchedule: DifferenceScheduleRow[];
};
export type DifferenceScheduleRow = ScheduleRow & {
  extraApplied: number;
};
function fgtsDeposit(state: FinancingState, month: number): number {
  return fgtsDepositForMonth(state.fgtsSalary, state.fgtsSalaryGrowth / 100, month);
}

export function calculate(state: FinancingState, includeFgts = false): Calculation {
  const termMonths = Math.max(12, Math.round(state.termMonths));
  const financedAmount = Math.max(0, state.property - state.entry);
  const monthlyRate = annualToMonthlyRate(state.financingRate / 100);
  let pricePayment = fixedPricePayment(financedAmount, monthlyRate, termMonths);
  let fixedAmortization = financedAmount / termMonths;
  let debt = financedAmount;
  let totalPaid = 0;
  let totalInterest = 0;
  let fgtsAvailable = 0;
  let fgtsAmortization = 0;
  const schedule: ScheduleRow[] = [];

  for (let month = 1; month <= termMonths && debt > BALANCE_TOLERANCE; month += 1) {
    if (includeFgts) fgtsAvailable += fgtsDeposit(state, month);
    const interest = debt * monthlyRate;
    // Reducing the term preserves the original payment curve. The lower
    // interest on the FGTS-adjusted balance becomes additional principal.
    const referencePayment = state.method === "PRICE" ? pricePayment
      : originalSacPayment(financedAmount, monthlyRate, termMonths, month);
    const scheduledPayment = includeFgts && state.fgtsMode === "PRAZO"
      ? referencePayment
      : state.method === "PRICE" ? pricePayment
        : sacPayment(debt, fixedAmortization, monthlyRate);
    const amortization = Math.min(debt, Math.max(0, scheduledPayment - interest));
    const payment = amortization + interest;
    debt = Math.max(0, debt - amortization);
    let fgtsApplied = 0;
    if (includeFgts && month % FGTS_USE_INTERVAL_MONTHS === 0 && debt > BALANCE_TOLERANCE) {
      fgtsApplied = Math.min(debt, fgtsAvailable);
      fgtsAvailable -= fgtsApplied;
      fgtsAmortization += fgtsApplied;
      debt = Math.max(0, debt - fgtsApplied);
      const remainingMonths = termMonths - month;
      if (debt > BALANCE_TOLERANCE && remainingMonths > 0) {
        if (state.fgtsMode === "PRESTACAO") {
          fixedAmortization = debt / remainingMonths;
          pricePayment = fixedPricePayment(debt, monthlyRate, remainingMonths);
        }
      }
    }
    totalPaid += payment;
    totalInterest += interest;
    schedule.push({ month, scheduledPayment, payment, interest, amortization, fgtsApplied, balance: debt });
  }
  return {
    financedAmount, financingPayment: schedule[0]?.payment ?? 0,
    financingPaymentEnd: schedule.at(-1)?.payment ?? 0,
    totalPaid, totalInterest, termEndBalance: schedule.at(-1)?.balance ?? 0,
    fgtsAmortization, schedule,
  };
}

export function calculateSacPriceScenario(state: FinancingState, includeFgts = true): SacPriceScenarioCalculation {
  const sacReference = calculate({ ...state, method: "SAC" }, false);
  const priceReference = calculate({ ...state, method: "PRICE" }, false);
  const sac = includeFgts ? calculate({ ...state, method: "SAC" }, true) : sacReference;
  const price = includeFgts ? calculate({ ...state, method: "PRICE" }, true) : priceReference;
  const monthlyRate = annualToMonthlyRate(state.financingRate / 100);
  // This indicator compares the contractual payment curves. It deliberately
  // ignores a partial final settlement caused by an early payoff.
  const equalizationIndex = sacReference.schedule.findIndex((row, index) => {
    const other = priceReference.schedule[index];
    return other !== undefined && row.scheduledPayment <= other.scheduledPayment + BALANCE_TOLERANCE;
  });
  let debt = price.financedAmount;
  let payoffMonth = debt > BALANCE_TOLERANCE ? price.schedule.length : 0;
  let extraAmortization = 0;
  let totalPaid = 0;
  let totalInterest = 0;
  let fgtsAvailable = 0;
  let fgtsAmortization = 0;
  const termMonths = Math.max(12, Math.round(state.termMonths));
  let pricePayment = fixedPricePayment(debt, monthlyRate, termMonths);
  const differenceSchedule: DifferenceScheduleRow[] = [];

  for (let index = 0; index < termMonths && debt > BALANCE_TOLERANCE; index += 1) {
    const month = index + 1;
    if (includeFgts) fgtsAvailable += fgtsDeposit(state, month);
    const scheduledPayment = pricePayment;
    const sacBudget = sac.schedule[index]?.payment ?? 0;
    const interest = debt * monthlyRate;
    const regularAmortization = Math.min(debt, Math.max(0, pricePayment - interest));
    const extraApplied = Math.min(Math.max(0, debt - regularAmortization), Math.max(0, sacBudget - pricePayment));
    const amortization = regularAmortization + extraApplied;
    debt = Math.max(0, debt - amortization);
    let fgtsApplied = 0;
    if (includeFgts && month % FGTS_USE_INTERVAL_MONTHS === 0 && debt > BALANCE_TOLERANCE) {
      const applied = Math.min(debt, fgtsAvailable);
      fgtsAvailable -= applied;
      fgtsAmortization += applied;
      debt = Math.max(0, debt - applied);
      fgtsApplied = applied;
      // Monthly cash extras shorten term; only FGTS in PRESTACAO resets the own encargo.
      if (state.fgtsMode === "PRESTACAO" && applied > 0 && month < termMonths) {
        pricePayment = fixedPricePayment(debt, monthlyRate, termMonths - month);
      }
    }
    extraAmortization += extraApplied;
    totalInterest += interest;
    totalPaid += interest + amortization;
    differenceSchedule.push({ month, scheduledPayment, payment: interest + amortization, interest, amortization, extraApplied, fgtsApplied, balance: debt });
    if (debt <= BALANCE_TOLERANCE) payoffMonth = month;
  }
  return {
    sac, price, sacReference, priceReference,
    equalizationMonth: equalizationIndex >= 0 ? equalizationIndex + 1 : null,
    payoffMonth, extraAmortization, totalPaid, totalInterest, fgtsAmortization,
    differenceSchedule,
  };
}
