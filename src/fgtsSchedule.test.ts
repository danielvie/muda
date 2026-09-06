import assert from "node:assert/strict";
import test from "node:test";
import { buildFgtsComparison, type FgtsMode, type FgtsMethodProjection } from "./fgtsSchedule.ts";
import { annualToMonthlyRate } from "./finance.ts";


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

test('SAC reduzir prazo mantém a quota de principal nos anos completos', () => {
  const comparison = projection('PRAZO');
  const quota = (input.valorImovel - input.entrada) / input.prazoMeses;
  const rate = annualToMonthlyRate(input.taxaAnual);
  const saldoAposFgts = input.valorImovel - input.entrada - 24 * quota - 24 * input.salarioMensal * 0.08;
  close(comparison.sac.prestacaoAposPrimeiroFgts!, quota + saldoAposFgts * rate);
  for (const year of comparison.sac.yearBlocks.slice(0, -1)) {
    close(year.amortizacaoProgramada, 12 * quota);
  }
  for (const p of [comparison.sac, comparison.price]) {
    close(p.prestacoes + p.fgtsAmortizacao, input.valorImovel - input.entrada + p.juros);
    close(p.fgtsGerado, p.fgtsAmortizacao + p.fgtsNaoUtilizado);
    close(p.yearBlocks.at(-1)!.saldoFinal, 0);
  }
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
