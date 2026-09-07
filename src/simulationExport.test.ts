import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "./financingProjection.ts";
import { formatSimulationValues } from "./simulationExport.ts";
import type { FinancingState } from "./financingControls.ts";

const state: FinancingState = {
  property: 800000,
  entry: 180000,
  financingRate: 12,
  termMonths: 420,
  fgtsSalary: 6000,
  fgtsSalaryGrowth: 4,
  fgtsMode: "PRAZO",
  method: "SAC",
};

test("formats the current financing inputs and results as copyable text", () => {
  const text = formatSimulationValues(state, calculate(state), true);

  assert.match(text, /Valor do imóvel: R\$ 800\.000,00/);
  assert.match(text, /Valor financiado: R\$ 620\.000,00/);
  assert.match(text, /Prazo: 420 meses \(35 anos\)/);
  assert.match(text, /FGTS considerado na comparação: Sim/);
  assert.match(text, /Primeira prestação:/);
  assert.match(text, /FGTS aplicado: R\$ 0,00/);
  assert.match(text, /Quitação prevista: 420 meses/);
  assert.match(text, /Saldo final previsto: R\$ 0,00/);
  assert.doesNotMatch(text, /undefined|NaN|Infinity/);
});

test("marks when FGTS is not included in the comparison", () => {
  const text = formatSimulationValues(state, calculate(state), false);

  assert.match(text, /FGTS considerado na comparação: Não/);
});
