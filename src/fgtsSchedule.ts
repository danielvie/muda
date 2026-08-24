import { annualToMonthlyRate } from "./finance";

export const FGTS_DEPOSIT_RATE = 0.08;
export const FGTS_USE_INTERVAL_MONTHS = 6;

const BALANCE_TOLERANCE = 0.005;

type FinancingMethod = "SAC" | "PRICE";

export type FgtsScheduleInput = {
  valorImovel: number;
  entrada: number;
  taxaAnual: number;
  prazoMeses: number;
  salarioMensal: number;
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
  prazoOriginalMeses: number;
  prazoFinalMeses: number;
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
  salarioMensal: number;
  fgtsMensalEstimado: number;
  intervaloUsoMeses: number;
  sac: FgtsMethodProjection;
  price: FgtsMethodProjection;
};

function pricePayment(pv: number, taxaMensal: number, prazoMeses: number) {
  if (pv === 0) return 0;
  if (taxaMensal === 0) return pv / prazoMeses;

  const factor = Math.pow(1 + taxaMensal, prazoMeses);
  return pv * (taxaMensal * factor) / (factor - 1);
}

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
  const amortizacaoSac = pv / prazoOriginalMeses;
  const prestacaoPrice = pricePayment(pv, taxaMensal, prazoOriginalMeses);
  const fgtsMensal = input.salarioMensal * FGTS_DEPOSIT_RATE;

  let saldo = pv;
  let fgtsDisponivel = 0;
  let prestacoes = 0;
  let juros = 0;
  let fgtsGerado = 0;
  let fgtsAmortizacao = 0;
  let fgtsAcionamentos = 0;
  const yearBlocks: FgtsYearBlock[] = [];

  for (let mes = 1; mes <= prazoOriginalMeses && saldo > BALANCE_TOLERANCE; mes += 1) {
    const saldoInicial = saldo;
    const fgtsDoMes = fgtsMensal;
    const taxaJuros = saldoInicial * taxaMensal;
    const amortizacaoPlanejada = metodo === "SAC"
      ? amortizacaoSac
      : prestacaoPrice - taxaJuros;
    const amortizacaoProgramada = Math.min(saldoInicial, Math.max(0, amortizacaoPlanejada));
    const prestacao = amortizacaoProgramada + taxaJuros;

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
    prazoOriginalMeses,
    prazoFinalMeses: yearBlocks.at(-1)?.mesFim ?? 0,
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
    input.salarioMensal <= 0
  ) {
    return null;
  }

  return {
    salarioMensal: input.salarioMensal,
    fgtsMensalEstimado: input.salarioMensal * FGTS_DEPOSIT_RATE,
    intervaloUsoMeses: FGTS_USE_INTERVAL_MONTHS,
    sac: projectMethod(input, "SAC"),
    price: projectMethod(input, "PRICE"),
  };
}
