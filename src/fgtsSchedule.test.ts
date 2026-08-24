import assert from "node:assert/strict";
import test from "node:test";
import { buildFgtsComparison, type FgtsMode } from "./fgtsSchedule.ts";

const input = {
  valorImovel: 800_000,
  entrada: 120_000,
  taxaAnual: 0.1,
  prazoMeses: 420,
  salarioMensal: 3_000,
  crescimentoSalarioAnual: 0,
};

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
