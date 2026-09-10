import type { FinancingState } from "./financingControls.ts";
import type { FieldMemory } from "./memory.tsx";
import type { FinanceVsInvestFields } from "./financeVsInvestProjection.ts";

export type ProgramInputs = {
  financing: FinancingState;
  includeFgts: boolean;
  priceInvestment: { annualRate: string };
  investment: Pick<FieldMemory, "saldoInicial" | "aporteMensal" | "taxaInvestAnual" | "mesesProj">;
  financeVsInvest: FinanceVsInvestFields;
};

const comparisonLabels = {
  availableMoney: "Dinheiro disponível (R$)",
  propertyPrice: "Valor do imóvel (R$)",
  financingAnnualRate: "Taxa efetiva do financiamento (% a.a.)",
  financingTermMonths: "Prazo do financiamento (meses)",
  amortizationMethod: "Sistema de amortização",
  monthlyRent: "Aluguel mensal (R$)",
  investmentAnnualReturn: "Retorno do investimento (% a.a.)",
  propertyAppreciationAnnual: "Valorização do imóvel (% a.a.)",
  rentInflationAnnual: "Inflação do aluguel (% a.a.)",
  budgetGrowthAnnual: "Crescimento do orçamento (% a.a.)",
  monthlyOwnershipCost: "Custo de posse (R$/mês)",
  monthlyBudget: "Orçamento mensal informado (R$)",
  horizonYears: "Horizonte (anos)",
} satisfies Record<keyof FinanceVsInvestFields, string>;

// Preserve input precision and expressions. No projection engine or derived values.
const input = (value: string | number) => typeof value === "number" ? String(value).replace(".", ",") : value.trim() || "[não informado]";
const yesNo = (value: boolean) => value ? "Sim" : "Não";

export function maskSalaryForPreview(text: string): string {
  return text.replace(/^(Salário mensal bruto para FGTS \(R\$\): ).*$/m, "$1[oculto]");
}

export function formatProgramInputs(data: ProgramInputs): string {
  const state = data.financing;
  return [
    "PREMISSAS ATUAIS DO PROGRAMA · v2",
    "Somente dados de entrada. Valores dos campos, sem resultados calculados.",
    "",
    "FINANCIAR",
    `Valor do imóvel (R$): ${input(state.property)}`,
    `Entrada (R$): ${input(state.entry)}`,
    `Taxa efetiva anual (% a.a.): ${input(state.financingRate)}`,
    `Prazo (meses): ${input(state.termMonths)}`,
    `Sistema de amortização: ${state.method}`,
    `Considerar FGTS: ${yesNo(data.includeFgts)}`,
    `Salário mensal bruto para FGTS (R$): ${input(state.fgtsSalary)}`,
    `Crescimento anual do salário (% a.a.): ${input(state.fgtsSalaryGrowth)}`,
    `Uso do FGTS: ${state.fgtsMode === "PRAZO" ? "Reduzir prazo" : "Reduzir prestação"}`,
    "",
    "COMPARAÇÃO COM PRICE · AMORTIZAR TODO MÊS OU INVESTIR ATÉ O CRUZAMENTO E AMORTIZAR",
    `Rentabilidade líquida estimada (% a.a.): ${input(data.priceInvestment.annualRate)}`,
    "",
    "INVESTIR · PROJEÇÃO INDEPENDENTE",
    `Saldo inicial (R$): ${input(data.investment.saldoInicial)}`,
    `Aporte mensal (R$): ${input(data.investment.aporteMensal)}`,
    `Taxa anual (% a.a.): ${input(data.investment.taxaInvestAnual)}`,
    `Período (meses): ${input(data.investment.mesesProj)}`,
    "",
    "COMPARAR · FINANCIAR OU INVESTIR MORANDO DE ALUGUEL",
    ...(Object.keys(comparisonLabels) as (keyof FinanceVsInvestFields)[]).map(key =>
      `${comparisonLabels[key]}: ${key === "monthlyBudget" && !data.financeVsInvest[key].trim() ? "[vazio: orçamento automático]" : input(data.financeVsInvest[key])}`),
  ].join("\n");
}
