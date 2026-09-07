import { brl } from "./format.ts";
import type { FinancingState } from "./financingControls.ts";
import type { Calculation } from "./financingProjection.ts";

const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const money = (value: number) => brl(value).replace(/\u00a0/g, " ");

export function formatSimulationValues(state: FinancingState, result: Calculation, includeFgts: boolean) {
  const termYears = state.termMonths / 12;
  const fgtsMode = state.fgtsMode === "PRAZO" ? "Reduzir prazo" : "Reduzir prestação";

  return [
    "SIMULAÇÃO DE FINANCIAMENTO",
    "",
    "CONFIGURAÇÃO",
    `Valor do imóvel: ${money(state.property)}`,
    `Entrada: ${money(state.entry)}`,
    `Valor financiado: ${money(result.financedAmount)}`,
    `Taxa efetiva anual: ${number(state.financingRate)}% a.a.`,
    `Prazo: ${number(state.termMonths)} meses (${number(termYears)} anos)`,
    `Sistema de amortização: ${state.method}`,
    `FGTS considerado na comparação: ${includeFgts ? "Sim" : "Não"}`,
    `Salário mensal bruto para FGTS: ${money(state.fgtsSalary)}`,
    `Crescimento anual do salário: ${number(state.fgtsSalaryGrowth)}% a.a.`,
    `Uso do FGTS: ${fgtsMode}`,
    "",
    "RESULTADOS",
    `Primeira prestação: ${money(result.financingPayment)}`,
    `Última prestação: ${money(result.financingPaymentEnd)}`,
    `Juros totais: ${money(result.totalInterest)}`,
    `Total pago em prestações: ${money(result.totalPaid)}`,
    `FGTS aplicado: ${money(result.fgtsAmortization)}`,
    `Quitação prevista: ${number(result.schedule.length)} meses`,
    `Saldo final previsto: ${money(result.termEndBalance)}`,
  ].join("\n");
}
