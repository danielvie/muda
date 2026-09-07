import type { FinancingState } from "./financingControls.ts";
import { calculate, type Calculation, type ScheduleRow } from "./financingProjection.ts";
import {
  fgtsDepositForMonth,
  FGTS_DEPOSIT_RATE,
  FGTS_USE_INTERVAL_MONTHS,
  type FgtsMode,
} from "./fgtsPolicy.ts";

export { FGTS_DEPOSIT_RATE, FGTS_USE_INTERVAL_MONTHS } from "./fgtsPolicy.ts";
export type { FgtsMode } from "./fgtsPolicy.ts";

type FinancingMethod = "SAC" | "PRICE";

export type FgtsScheduleInput = {
  valorImovel: number;
  entrada: number;
  taxaAnual: number;
  prazoMeses: number;
  salarioMensal: number;
  crescimentoSalarioAnual: number;
  modo: FgtsMode;
};

export type FgtsYearBlock = {
  ano: number;
  mesInicio: number;
  mesFim: number;
  saldoInicial: number;
  saldoFinal: number;
  primeiraPrestacao: number;
  ultimaPrestacao: number;
  prestacoes: number;
  juros: number;
  amortizacaoProgramada: number;
  fgtsGerado: number;
  fgtsAmortizacao: number;
};

export type FgtsMethodProjection = {
  metodo: FinancingMethod;
  modo: FgtsMode;
  prazoOriginalMeses: number;
  prazoFinalMeses: number;
  primeiraPrestacao: number;
  prestacaoAposPrimeiroFgts: number | null;
  prestacoes: number;
  juros: number;
  fgtsGerado: number;
  fgtsAmortizacao: number;
  fgtsAcionamentos: number;
  fgtsNaoUtilizado: number;
  valorEfetivoImovel: number;
  yearBlocks: FgtsYearBlock[];
};

export type FgtsComparison = {
  modo: FgtsMode;
  salarioMensal: number;
  crescimentoSalarioAnual: number;
  fgtsMensalEstimado: number;
  intervaloUsoMeses: number;
  sac: FgtsMethodProjection;
  price: FgtsMethodProjection;
};

function startingBalance(row: ScheduleRow) {
  return row.balance + row.amortization + row.fgtsApplied;
}

function summarizeYear(
  rows: ScheduleRow[],
  input: FgtsScheduleInput,
  yearIndex: number,
): FgtsYearBlock {
  const first = rows[0];
  const last = rows.at(-1)!;
  return {
    ano: yearIndex + 1,
    mesInicio: first.month,
    mesFim: last.month,
    saldoInicial: startingBalance(first),
    saldoFinal: last.balance,
    primeiraPrestacao: first.payment,
    ultimaPrestacao: last.payment,
    prestacoes: rows.reduce((sum, row) => sum + row.payment, 0),
    juros: rows.reduce((sum, row) => sum + row.interest, 0),
    amortizacaoProgramada: rows.reduce((sum, row) => sum + row.amortization, 0),
    fgtsGerado: rows.reduce(
      (sum, row) => sum + fgtsDepositForMonth(input.salarioMensal, input.crescimentoSalarioAnual, row.month),
      0,
    ),
    fgtsAmortizacao: rows.reduce((sum, row) => sum + row.fgtsApplied, 0),
  };
}

function summarizeMethod(
  input: FgtsScheduleInput,
  metodo: FinancingMethod,
  calculation: Calculation,
): FgtsMethodProjection {
  const firstFgtsIndex = calculation.schedule.findIndex(row => row.fgtsApplied > 0.005);
  const fgtsGerado = calculation.schedule.reduce(
    (sum, row) => sum + fgtsDepositForMonth(input.salarioMensal, input.crescimentoSalarioAnual, row.month),
    0,
  );
  const years = Math.ceil(calculation.schedule.length / 12);
  const yearBlocks = Array.from({ length: years }, (_, index) =>
    summarizeYear(calculation.schedule.slice(index * 12, index * 12 + 12), input, index),
  );

  return {
    metodo,
    modo: input.modo,
    prazoOriginalMeses: Math.max(1, Math.trunc(input.prazoMeses)),
    prazoFinalMeses: calculation.schedule.length,
    primeiraPrestacao: calculation.financingPayment,
    prestacaoAposPrimeiroFgts: firstFgtsIndex < 0
      ? null
      : calculation.schedule[firstFgtsIndex + 1]?.payment ?? 0,
    prestacoes: calculation.totalPaid,
    juros: calculation.totalInterest,
    fgtsGerado,
    fgtsAmortizacao: calculation.fgtsAmortization,
    fgtsAcionamentos: calculation.schedule.filter(row => row.fgtsApplied > 0.005).length,
    fgtsNaoUtilizado: Math.max(0, fgtsGerado - calculation.fgtsAmortization),
    valorEfetivoImovel: input.entrada + calculation.totalPaid + calculation.fgtsAmortization,
    yearBlocks,
  };
}

function validInput(input: FgtsScheduleInput) {
  return (
    Number.isFinite(input.valorImovel) &&
    Number.isFinite(input.entrada) &&
    Number.isFinite(input.taxaAnual) &&
    Number.isFinite(input.prazoMeses) &&
    Number.isFinite(input.salarioMensal) &&
    input.salarioMensal > 0 &&
    Number.isFinite(input.crescimentoSalarioAnual) &&
    input.crescimentoSalarioAnual >= 0 &&
    (input.modo === "PRAZO" || input.modo === "PRESTACAO")
  );
}

export function buildFgtsComparisonFromCalculations(
  input: FgtsScheduleInput,
  sac: Calculation,
  price: Calculation,
): FgtsComparison | null {
  if (!validInput(input)) return null;
  return {
    modo: input.modo,
    salarioMensal: input.salarioMensal,
    crescimentoSalarioAnual: input.crescimentoSalarioAnual,
    fgtsMensalEstimado: input.salarioMensal * FGTS_DEPOSIT_RATE,
    intervaloUsoMeses: FGTS_USE_INTERVAL_MONTHS,
    sac: summarizeMethod(input, "SAC", sac),
    price: summarizeMethod(input, "PRICE", price),
  };
}

export function buildFgtsComparison(
  input: FgtsScheduleInput,
): FgtsComparison | null {
  if (!validInput(input)) return null;

  const state: FinancingState = {
    property: input.valorImovel,
    entry: input.entrada,
    financingRate: input.taxaAnual * 100,
    termMonths: input.prazoMeses,
    fgtsSalary: input.salarioMensal,
    fgtsSalaryGrowth: input.crescimentoSalarioAnual * 100,
    fgtsMode: input.modo,
    method: "SAC",
  };
  const sac = calculate(state, true);
  const price = calculate({ ...state, method: "PRICE" }, true);
  return buildFgtsComparisonFromCalculations(input, sac, price);
}
