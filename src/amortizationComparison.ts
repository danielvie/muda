import { annualToMonthlyRate } from "./finance.ts";
import { calculate } from "./financingProjection.ts";
import { fixedPricePayment } from "./loanPayments.ts";
import { fgtsDepositForMonth, FGTS_USE_INTERVAL_MONTHS } from "./fgtsPolicy.ts";
import type { FinancingState } from "./financingControls.ts";

const CENT_TOLERANCE = 0.005;
export function parseInvestmentRate(value: string): number | null {
  if (!value.trim()) return null;
  const rate = Number(value.replace(",", "."));
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null;
}

export type ComparisonMonth = {
  month: number; budget: number; cash: number; payment: number; extra: number;
  contribution: number; redemption: number; earnings: number; investment: number;
  interest: number; debt: number; fgtsApplied: number; fgtsRemaining: number;
  cashCommitted: number; fgtsUsed: number;
};
export type ComparisonStrategy = {
  atCrossing: ComparisonMonth;
  position: number;
  payoffMonth: number | null;
  cashUntilPayoff: number | null;
  investmentAtPayoff: number | null;
  totalInterest: number;
  schedule: ComparisonMonth[];
};
export type AmortizationComparison =
  | { status: "no-debt" | "no-crossing" }
  | { status: "ready"; crossingMonth: number; budgets: number[];
      amortize: ComparisonStrategy; invest: ComparisonStrategy;
      better: "amortize" | "invest" | "tie"; advantage: number };

/** One exogenous budget and date for both strategies, taken from the original
 * no-FGTS curves. At/after the crossover the budget is the original PRICE payment.
 * Until the common date, early payoff does not make the unused budget disappear:
 * it goes into savings in either strategy. This keeps the comparison equally funded.
 */
export function compareAmortization(state: FinancingState, includeFgts: boolean, annualInvestmentRate: number): AmortizationComparison {
  if (parseInvestmentRate(String(annualInvestmentRate)) === null) throw new RangeError("Rentabilidade anual inválida.");
  const price = calculate({ ...state, method: "PRICE" }, false);
  if (price.financedAmount <= CENT_TOLERANCE) return { status: "no-debt" };
  const sac = calculate({ ...state, method: "SAC" }, false);
  const crossIndex = sac.schedule.findIndex((row, index) => {
    const other = price.schedule[index];
    return other && row.scheduledPayment <= other.scheduledPayment + CENT_TOLERANCE;
  });
  if (crossIndex < 0) return { status: "no-crossing" };
  const crossingMonth = crossIndex + 1;
  const term = Math.max(12, Math.round(state.termMonths));
  const originalPrice = price.schedule[0].scheduledPayment;
  const budgets = Array.from({ length: term }, (_, index) => Math.max(originalPrice, sac.schedule[index]?.scheduledPayment ?? 0));
  const loanRate = annualToMonthlyRate(state.financingRate / 100);
  const investmentRate = annualToMonthlyRate(annualInvestmentRate / 100);

  function project(later: boolean): ComparisonStrategy {
    let debt = price.financedAmount;
    let installment = originalPrice;
    let investment = 0;
    let fgtsRemaining = 0;
    let fgtsUsed = 0;
    let cashCommitted = state.entry;
    let totalInterest = 0;
    let payoffMonth: number | null = null;
    let cashUntilPayoff: number | null = null;
    let investmentAtPayoff: number | null = null;
    const schedule: ComparisonMonth[] = [];

    for (let month = 1; month <= term; month++) {
      const budget = budgets[month - 1];
      const earnings = investment * investmentRate;
      investment += earnings;
      if (includeFgts) fgtsRemaining += fgtsDepositForMonth(state.fgtsSalary, state.fgtsSalaryGrowth / 100, month);
      const interest = debt * loanRate;
      const payment = Math.min(debt + interest, installment);
      debt = Math.max(0, debt - Math.max(0, payment - interest));
      const surplus = Math.max(0, budget - payment);
      // Once the common date has passed, both strategies direct the remaining
      // budget to term-reducing amortization. No repeated investment redemptions.
      const extra = !later || month > crossingMonth ? Math.min(debt, surplus) : 0;
      debt = Math.max(0, debt - extra);
      const contribution = month <= crossingMonth ? Math.max(0, surplus - extra) : 0;
      investment += contribution;
      const cash = payment + extra + contribution;
      cashCommitted += cash;
      let fgtsApplied = 0;
      if (includeFgts && month % FGTS_USE_INTERVAL_MONTHS === 0 && debt > CENT_TOLERANCE) {
        fgtsApplied = Math.min(debt, fgtsRemaining);
        debt -= fgtsApplied;
        fgtsRemaining -= fgtsApplied;
        fgtsUsed += fgtsApplied;
        // Only FGTS may reset the installment. The cash lump sum below reduces
        // term, not installment, even when it occurs in the same month as FGTS.
        if (state.fgtsMode === "PRESTACAO" && fgtsApplied > 0 && month < term) installment = fixedPricePayment(debt, loanRate, term - month);
      }
      const redemption = later && month === crossingMonth ? Math.min(investment, debt) : 0;
      investment -= redemption;
      debt = Math.max(0, debt - redemption);
      totalInterest += interest;
      if (payoffMonth === null && debt <= CENT_TOLERANCE) {
        payoffMonth = month;
        cashUntilPayoff = cashCommitted;
        investmentAtPayoff = investment;
        debt = 0;
      }
      schedule.push({ month, budget, cash, payment, extra, contribution, redemption, earnings, investment, interest, debt, fgtsApplied, fgtsRemaining, cashCommitted, fgtsUsed });
    }
    const atCrossing = schedule[crossIndex];
    return { atCrossing, position: atCrossing.investment + atCrossing.fgtsRemaining - atCrossing.debt,
      payoffMonth, cashUntilPayoff, investmentAtPayoff, totalInterest, schedule };
  }
  const amortize = project(false);
  const invest = project(true);
  const difference = invest.position - amortize.position;
  return { status: "ready", crossingMonth, budgets, amortize, invest,
    better: Math.abs(difference) < CENT_TOLERANCE ? "tie" : difference > 0 ? "invest" : "amortize",
    advantage: Math.abs(difference) };
}
