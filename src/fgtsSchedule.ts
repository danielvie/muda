import { annualToMonthlyRate } from "./finance.ts";
import { fixedPricePayment, sacPayment } from "./loanPayments.ts";

export const FGTS_DEPOSIT_RATE = 0.08;
export const FGTS_USE_INTERVAL_MONTHS = 24;

const BALANCE_TOLERANCE = 0.005;

type FinancingMethod = "SAC" | "PRICE";

export type FgtsMode = "PRAZO" | "PRESTACAO";

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

function createYearBlock(ano: number, mes: number, saldoInicial: number): FgtsYearBlock {
  return {
    ano,
    mesInicio: mes,
    mesFim: mes,
    saldoInicial,
    saldoFinal: saldoInicial,
    primeiraPrestacao: 0,
    ultimaPrestacao: 0,
    prestacoes: 0,
    juros: 0,
    amortizacaoProgramada: 0,
    fgtsGerado: 0,
    fgtsAmortizacao: 0,
  };
}

function projectMethod(input: FgtsScheduleInput, metodo: FinancingMethod): FgtsMethodProjection {
  const prazoOriginalMeses = Math.max(1, Math.trunc(input.prazoMeses));
  const pv = Math.max(0, input.valorImovel - input.entrada);
  const taxaMensal = annualToMonthlyRate(input.taxaAnual);
  let amortizacaoSac = pv / prazoOriginalMeses;
  let prestacaoPrice = fixedPricePayment(pv, taxaMensal, prazoOriginalMeses);

  let saldo = pv;
  let fgtsDisponivel = 0;
  let prestacoes = 0;
  let juros = 0;
  let fgtsGerado = 0;
  let fgtsAmortizacao = 0;
  let fgtsAcionamentos = 0;
  let primeiraPrestacao = 0;
  let prestacaoAposPrimeiroFgts: number | null = null;
  const yearBlocks: FgtsYearBlock[] = [];

  for (let mes = 1; mes <= prazoOriginalMeses && saldo > BALANCE_TOLERANCE; mes += 1) {
    const saldoInicial = saldo;
    const salarioDoMes = input.salarioMensal * Math.pow(
      1 + input.crescimentoSalarioAnual,
      Math.floor((mes - 1) / 12),
    );
    const fgtsDoMes = salarioDoMes * FGTS_DEPOSIT_RATE;
    const taxaJuros = saldoInicial * taxaMensal;
    const prestacaoPlanejada = metodo === "PRICE" ? prestacaoPrice
      : sacPayment(saldoInicial, amortizacaoSac, taxaMensal);
    const amortizacaoPlanejada = prestacaoPlanejada - taxaJuros;
    const amortizacaoProgramada = Math.min(saldoInicial, Math.max(0, amortizacaoPlanejada));
    const prestacao = amortizacaoProgramada + taxaJuros;
    if (mes === 1) primeiraPrestacao = prestacao;

    saldo = Math.max(0, saldoInicial - amortizacaoProgramada);
    fgtsDisponivel += fgtsDoMes;
    fgtsGerado += fgtsDoMes;
    prestacoes += prestacao;
    juros += taxaJuros;

    let amortizacaoComFgts = 0;
    if (mes % FGTS_USE_INTERVAL_MONTHS === 0 && saldo > BALANCE_TOLERANCE) {
      amortizacaoComFgts = Math.min(saldo, fgtsDisponivel);
      if (amortizacaoComFgts > BALANCE_TOLERANCE) fgtsAcionamentos += 1;
      fgtsDisponivel -= amortizacaoComFgts;
      fgtsAmortizacao += amortizacaoComFgts;
      saldo = Math.max(0, saldo - amortizacaoComFgts);

      const mesesRestantes = prazoOriginalMeses - mes;
      if (input.modo === "PRESTACAO" && saldo > BALANCE_TOLERANCE && mesesRestantes > 0) {
        amortizacaoSac = saldo / mesesRestantes;
        prestacaoPrice = fixedPricePayment(saldo, taxaMensal, mesesRestantes);
      }

      if (fgtsAcionamentos === 1 && amortizacaoComFgts > BALANCE_TOLERANCE) {
        const proximoJuro = saldo * taxaMensal;
        const proximaPrestacaoPlanejada = metodo === "PRICE" ? prestacaoPrice
          : sacPayment(saldo, amortizacaoSac, taxaMensal);
        const proximaAmortizacao = Math.min(saldo, Math.max(0, proximaPrestacaoPlanejada - proximoJuro));
        prestacaoAposPrimeiroFgts = proximaAmortizacao + proximoJuro;
      }
    }

    const ano = Math.ceil(mes / 12);
    const block = yearBlocks[ano - 1] ?? createYearBlock(ano, mes, saldoInicial);
    block.mesFim = mes;
    block.saldoFinal = saldo;
    block.primeiraPrestacao = block.primeiraPrestacao || prestacao;
    block.ultimaPrestacao = prestacao;
    block.prestacoes += prestacao;
    block.juros += taxaJuros;
    block.amortizacaoProgramada += amortizacaoProgramada;
    block.fgtsGerado += fgtsDoMes;
    block.fgtsAmortizacao += amortizacaoComFgts;
    yearBlocks[ano - 1] = block;
  }

  return {
    metodo,
    modo: input.modo,
    prazoOriginalMeses,
    prazoFinalMeses: yearBlocks.at(-1)?.mesFim ?? 0,
    primeiraPrestacao,
    prestacaoAposPrimeiroFgts,
    prestacoes,
    juros,
    fgtsGerado,
    fgtsAmortizacao,
    fgtsAcionamentos,
    fgtsNaoUtilizado: fgtsDisponivel,
    valorEfetivoImovel: input.entrada + prestacoes + fgtsAmortizacao,
    yearBlocks,
  };
}

export function buildFgtsComparison(
  input: FgtsScheduleInput,
): FgtsComparison | null {
  if (
    !Number.isFinite(input.valorImovel) ||
    !Number.isFinite(input.entrada) ||
    !Number.isFinite(input.taxaAnual) ||
    !Number.isFinite(input.prazoMeses) ||
    !Number.isFinite(input.salarioMensal) ||
    input.salarioMensal <= 0 ||
    !Number.isFinite(input.crescimentoSalarioAnual) ||
    input.crescimentoSalarioAnual < 0 ||
    (input.modo !== "PRAZO" && input.modo !== "PRESTACAO")
  ) {
    return null;
  }

  return {
    modo: input.modo,
    salarioMensal: input.salarioMensal,
    crescimentoSalarioAnual: input.crescimentoSalarioAnual,
    fgtsMensalEstimado: input.salarioMensal * FGTS_DEPOSIT_RATE,
    intervaloUsoMeses: FGTS_USE_INTERVAL_MONTHS,
    sac: projectMethod(input, "SAC"),
    price: projectMethod(input, "PRICE"),
  };
}
