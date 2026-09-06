import type { FinancingComparisonProps } from "./FinancingComparison.tsx";
import type { FinancingState } from "../financingControls.ts";
import { calculateSacPriceScenario } from "../financingProjection.ts";
import { buildFgtsComparison, FGTS_DEPOSIT_RATE, FGTS_USE_INTERVAL_MONTHS } from "../fgtsSchedule.ts";

// Fixed UI test assumptions, evaluated by the corrected production calculators.
const state: FinancingState = {
  property: 800000, entry: 200000, financingRate: 10, termMonths: 360,
  fgtsSalary: 20000, fgtsSalaryGrowth: 3, fgtsMode: "PRAZO", method: "SAC",
};

export const comparisonFixture: FinancingComparisonProps = {
  state,
  scenario: calculateSacPriceScenario(state, true),
  fgtsComparison: buildFgtsComparison({
    valorImovel: state.property, entrada: state.entry, taxaAnual: state.financingRate / 100,
    prazoMeses: state.termMonths, salarioMensal: state.fgtsSalary,
    crescimentoSalarioAnual: state.fgtsSalaryGrowth / 100, modo: state.fgtsMode,
  }),
  includeFgts: true, onIncludeFgtsChange: () => {}, update: () => {},
  fgtsMonthlyEstimate: state.fgtsSalary * FGTS_DEPOSIT_RATE,
  fgtsIntervalMonths: FGTS_USE_INTERVAL_MONTHS,
};
