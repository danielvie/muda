export type InvestmentProjectionInput = {
  saldoInicial: number;
  aporteMensal: number;
  taxaAnual: number; // ex: 0.10 = 10% a.a.
  meses: number;
};

export type InvestmentProjectionResult = {
  saldoFinal: number;
  totalAportado: number;
  ganho: number;
  serie: number[]; // saldo ao fim de cada mês
};

export function annualToMonthlyRate(taxaAnual: number): number {
  if (!Number.isFinite(taxaAnual)) throw new Error("taxaAnual inválida");
  // taxa efetiva mensal
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

export function projectInvestment(
  input: InvestmentProjectionInput,
): InvestmentProjectionResult {
  const meses = Math.max(0, Math.trunc(input.meses));
  const aporteMensal = Number.isFinite(input.aporteMensal)
    ? input.aporteMensal
    : 0;
  const iM = annualToMonthlyRate(input.taxaAnual);

  let saldo = Number.isFinite(input.saldoInicial) ? input.saldoInicial : 0;
  const serie: number[] = [];

  for (let m = 0; m < meses; m++) {
    // rende no mês, depois aporta no fim do mês
    saldo = saldo * (1 + iM) + aporteMensal;
    serie.push(saldo);
  }

  const totalAportado = aporteMensal * meses;
  const saldoFinal = saldo;
  const ganho = saldoFinal - input.saldoInicial - totalAportado;

  return { saldoFinal, totalAportado, ganho, serie };
}

export type SacInput = {
  valorImovel: number;
  entrada: number;
  taxaAnual: number; // ex: 0.12 = 12% a.a.
  prazoMeses: number;
};

export type SacInstallment = {
  mes: number; // 1..n
  saldoDevedorInicial: number;
  amortizacao: number;
  juros: number;
  prestacao: number;
};

export function sacInstallmentAt(input: SacInput, mes: number): SacInstallment {
  const n = Math.max(1, Math.trunc(input.prazoMeses));
  const k = Math.min(Math.max(1, Math.trunc(mes)), n);

  const pv = Math.max(0, input.valorImovel - input.entrada);
  const iM = annualToMonthlyRate(input.taxaAnual);
  const amortizacao = pv / n;

  const saldoDevedorInicial = pv - amortizacao * (k - 1);
  const juros = saldoDevedorInicial * iM;
  const prestacao = amortizacao + juros;

  return { mes: k, saldoDevedorInicial, amortizacao, juros, prestacao };
}

export type SacSummary = {
  pv: number;
  taxaMensal: number;
  amortizacao: number;
  prestacaoMes1: number;
  prestacaoMesK: number;
  prestacaoUltima: number;
};

export function sacSummary(
  input: SacInput,
  mesConsulta: number,
): SacSummary {
  const n = Math.max(1, Math.trunc(input.prazoMeses));
  const pv = Math.max(0, input.valorImovel - input.entrada);
  const taxaMensal = annualToMonthlyRate(input.taxaAnual);
  const amortizacao = pv / n;

  const p1 = sacInstallmentAt(input, 1).prestacao;
  const pk = sacInstallmentAt(input, mesConsulta).prestacao;
  const pn = sacInstallmentAt(input, n).prestacao;

  return {
    pv,
    taxaMensal,
    amortizacao,
    prestacaoMes1: p1,
    prestacaoMesK: pk,
    prestacaoUltima: pn,
  };
}
