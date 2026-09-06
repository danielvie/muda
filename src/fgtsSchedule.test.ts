import assert from "node:assert/strict";
import test from "node:test";
import { buildFgtsComparison, type FgtsMode, type FgtsMethodProjection } from "./fgtsSchedule.ts";
import { annualToMonthlyRate } from "./finance.ts";
import { originalSacPayment, fixedPricePayment } from "./loanPayments.ts";

const input = {
  valorImovel: 800_000,
  entrada: 120_000,
  taxaAnual: 0.1,
  prazoMeses: 420,
  salarioMensal: 3_000,
  crescimentoSalarioAnual: 0,
};

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.01, `${actual} differs from ${expected}`);

function projection(modo: FgtsMode) {
  const result = buildFgtsComparison({ ...input, modo });
  assert.ok(result);
  return result;
}

test("FGTS permite reduzir o prazo ou o valor das prestações", () => {
  const prazo = projection("PRAZO");
  const prestacao = projection("PRESTACAO");

  for (const metodo of ["sac", "price"] as const) {
    assert.ok(prazo[metodo].prazoFinalMeses < input.prazoMeses);
    assert.equal(prestacao[metodo].prazoFinalMeses, input.prazoMeses);
    assert.equal(prestacao[metodo].primeiraPrestacao, prazo[metodo].primeiraPrestacao);
    assert.ok(
      prestacao[metodo].prestacaoAposPrimeiroFgts! <
        prazo[metodo].prestacaoAposPrimeiroFgts!,
    );
    assert.ok(prazo[metodo].juros < prestacao[metodo].juros);
  }
});

test('reduzir prazo preserva a sequência original, exceto o acerto final', () => {
  const comparison = projection('PRAZO');
  const principal = input.valorImovel - input.entrada;
  const rate = annualToMonthlyRate(input.taxaAnual);
  for (const key of ['sac', 'price'] as const) {
    const p = comparison[key];
    const planned = (month: number) => key === 'sac' ? originalSacPayment(principal, rate, input.prazoMeses, month) : fixedPricePayment(principal, rate, input.prazoMeses);
    close(p.prestacaoAposPrimeiroFgts!, planned(25));
    for (const year of p.yearBlocks) {
      if (year.mesInicio < p.prazoFinalMeses) close(year.primeiraPrestacao, planned(year.mesInicio));
      if (year.mesFim < p.prazoFinalMeses) close(year.ultimaPrestacao, planned(year.mesFim));
      else assert.ok(year.ultimaPrestacao <= planned(year.mesFim) + 0.005);
    }
    close(p.prestacoes + p.fgtsAmortizacao, principal + p.juros);
    close(p.fgtsGerado, p.fgtsAmortizacao + p.fgtsNaoUtilizado);
    close(p.yearBlocks.at(-1)!.saldoFinal, 0);
  }
  assert.ok(comparison.sac.yearBlocks[2].amortizacaoProgramada > principal / input.prazoMeses * 12);
});

test('o painel FGTS mantém a convenção de taxa efetiva existente', () => {
  const comparison = buildFgtsComparison({ ...input, valorImovel: 1050000, entrada: 210000, taxaAnual: 0.115, salarioMensal: 30000, crescimentoSalarioAnual: 0.03, modo: 'PRAZO' });
  assert.ok(comparison);
  close(comparison.sac.primeiraPrestacao, 9654.473486999872);
  close(comparison.price.primeiraPrestacao, 7827.863012643816);
  close(comparison.sac.prestacaoAposPrimeiroFgts!, 9217.07500202845);
  assert.equal(comparison.sac.prazoFinalMeses, 132);
  assert.equal(comparison.price.prazoFinalMeses, 153);
});

test('reduzir prestação mantém os resultados anteriores', () => {
  const comparison = buildFgtsComparison({ ...input, valorImovel: 1050000, entrada: 210000, taxaAnual: 0.115, salarioMensal: 30000, crescimentoSalarioAnual: 0.03, modo: 'PRESTACAO' });
  assert.ok(comparison);
  assert.equal(comparison.sac.prazoFinalMeses, 216);
  assert.equal(comparison.price.prazoFinalMeses, 240);
  close(comparison.sac.juros, 797128.0732865079);
  close(comparison.price.juros, 1087571.2506657406);
});

test('quitação por FGTS não cobra prestação depois do fim da dívida', () => {
  const comparison = buildFgtsComparison({ ...input, salarioMensal: 1000000, modo: 'PRAZO' });
  assert.ok(comparison);
  for (const key of ['sac', 'price'] as const) {
    const p: FgtsMethodProjection = comparison[key];
    assert.equal(p.prazoFinalMeses, 24);
    assert.equal(p.prestacaoAposPrimeiroFgts, 0);
    close(p.prestacoes + p.fgtsAmortizacao, input.valorImovel - input.entrada + p.juros);
  }
});
