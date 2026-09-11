import test from "node:test";
import assert from "node:assert/strict";
import { formatProgramInputs, maskSalaryForPreview, type ProgramInputs } from "./simulationExport.ts";
import { defaultFinanceVsInvestFields } from "./financeVsInvestProjection.ts";

const inputs: ProgramInputs = {
  financing: {
    property: 800000, entry: 180000, financingRate: 11, termMonths: 420,
    fgtsSalary: 6000, fgtsSalaryGrowth: 4, fgtsMode: "PRAZO", method: "PRICE",
  },
  includeFgts: true,
  priceInvestment: { annualRate: "14" },
  investment: { saldoInicial: "50000", aporteMensal: "2000", taxaInvestAnual: "10", mesesProj: "24" },
  financeVsInvest: { ...defaultFinanceVsInvestFields },
};

test("exports all financing and amortization-comparison inputs, including both independent rates",  () => {
  const text = formatProgramInputs(inputs);
  for (const line of [
    "Valor do imóvel (R$): 800000", "Entrada (R$): 180000", "Taxa efetiva anual (% a.a.): 11",
    "Prazo (meses): 420", "Sistema de amortização: PRICE", "Considerar FGTS: Sim",
    "Salário mensal bruto para FGTS (R$): 6000", "Crescimento anual do salário (% a.a.): 4",
    "Uso do FGTS: Reduzir prazo", "Rentabilidade líquida estimada (% a.a.): 14",
    "PRICE+ · AMORTIZAR TODO MÊS OU INVESTIR PARA AMORTIZAR DEPOIS",
  ]) assert.ok(text.includes(line), line);
});

test("exports independent investment and every advanced finance-versus-rent input without computing automatic budget", () => {
  const text = formatProgramInputs(inputs);
  for (const line of [
    "Saldo inicial (R$): 50000", "Aporte mensal (R$): 2000", "Taxa anual (% a.a.): 10", "Período (meses): 24",
    "Dinheiro disponível (R$): 100000", "Valor do imóvel (R$): 500000",
    "Taxa efetiva do financiamento (% a.a.): 10", "Prazo do financiamento (meses): 360",
    "Sistema de amortização: SAC", "Aluguel mensal (R$): 2500", "Retorno do investimento (% a.a.): 10",
    "Valorização do imóvel (% a.a.): 4", "Inflação do aluguel (% a.a.): 5", "Crescimento do orçamento (% a.a.): 0",
    "Custo de posse (R$/mês): 0", "Orçamento mensal informado (R$): [vazio: orçamento automático]", "Horizonte (anos): 10",
  ]) assert.ok(text.includes(line), line);
  assert.equal(text.split("COMPARAR · FINANCIAR OU INVESTIR MORANDO DE ALUGUEL\n")[1].split("\n").length, Object.keys(defaultFinanceVsInvestFields).length);
});

test("exports only whitelisted primary inputs, never derived outputs or legacy hidden financing values", () => {
  const data = {
    ...inputs,
    financing: { ...inputs.financing, financedAmount: 620000, totalInterest: 111111 },
    investment: { ...inputs.investment, valorImovel: "9999999", saldoFinal: "222222" },
    financeVsInvest: { ...inputs.financeVsInvest, winner: "finance", finalInvestNetWorth: "333333" },
  };
  const text = formatProgramInputs(data);
  assert.doesNotMatch(text, /Valor financiado|Primeira prestação|Última prestação|Juros totais|Total pago|Saldo final|Quitação prevista|RESULTADOS|Patrimônio|111111|222222|333333|9999999/);
});

test("preserves precision, zero, raw expressions and missing values instead of substituting results", () => {
  const data: ProgramInputs = {
    ...inputs, financing: { ...inputs.financing, financingRate: 11.123456789 },
    priceInvestment: { annualRate: "0" },
    investment: { ...inputs.investment, aporteMensal: "1000*2", taxaInvestAnual: "8,123456789" },
    financeVsInvest: { ...inputs.financeVsInvest, monthlyBudget: "9000" },
  };
  const text = formatProgramInputs(data);
  assert.match(text, /11,123456789/);
  assert.match(text, /Rentabilidade líquida estimada \(% a.a.\): 0/);
  assert.doesNotMatch(text, /Quitar quando o investimento cobrir a dívida/);
  assert.match(text, /1000\*2/);
  assert.match(text, /8,123456789/);
  assert.match(text, /Orçamento mensal informado \(R\$\): 9000/);
  assert.match(formatProgramInputs({ ...inputs, priceInvestment: { annualRate: "" } }), /Rentabilidade líquida estimada \(% a.a.\): \[não informado\]/);
});

test("salary preview is masked without changing the copied primary inputs", () => {
  const raw = formatProgramInputs(inputs);
  const preview = maskSalaryForPreview(raw);
  assert.match(preview, /Salário mensal bruto para FGTS \(R\$\): \[oculto\]/);
  assert.doesNotMatch(preview, /Salário mensal bruto para FGTS \(R\$\): 6000/);
  assert.match(raw, /Salário mensal bruto para FGTS \(R\$\): 6000/);
  assert.equal(formatProgramInputs(inputs), raw);
  assert.match(preview, /Crescimento anual do salário \(% a.a.\): 4/);
});

test("FGTS disabled still exports its configured inputs; input changes update the export", () => {
  const text = formatProgramInputs({ ...inputs, includeFgts: false, financing: { ...inputs.financing, fgtsMode: "PRESTACAO" } });
  assert.match(text, /Considerar FGTS: Não/);
  assert.match(text, /Uso do FGTS: Reduzir prestação/);
  assert.match(text, /Salário mensal bruto para FGTS \(R\$\): 6000/);
  const changed = formatProgramInputs({ ...inputs, priceInvestment: { annualRate: "8,5" } });
  assert.match(changed, /Rentabilidade líquida estimada \(% a.a.\): 8,5/);
  assert.notEqual(changed, formatProgramInputs(inputs));
});
